
import { readdir, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { cwd } from 'node:process'
import { BlockMetadata } from '../../../packages/blocks/framework/src'
import { BlockCategory, extractBlockFromModule } from '../../../packages/shared/src'
import * as semver from 'semver'
import { readPackageJson } from './files'
type Block = {
    name: string;
    displayName: string;
    version: string;
    minimumSupportedRelease?: string;
    maximumSupportedRelease?: string;
    metadata(): Omit<BlockMetadata, 'name' | 'version'>;
};

export const BLOCKS_FOLDER = 'packages/blocks'

const validateSupportedRelease = (minRelease: string | undefined, maxRelease: string | undefined) => {
    if (minRelease !== undefined && !semver.valid(minRelease)) {
        throw Error(`[validateSupportedRelease] "minimumSupportedRelease" should be a valid semver version`)
    }

    if (maxRelease !== undefined && !semver.valid(maxRelease)) {
        throw Error(`[validateSupportedRelease] "maximumSupportedRelease" should be a valid semver version`)
    }

    if (minRelease !== undefined && maxRelease !== undefined && semver.gt(minRelease, maxRelease)) {
        throw Error(`[validateSupportedRelease] "minimumSupportedRelease" should be less than "maximumSupportedRelease"`)
    }
}

const validateMetadata = (blockMetadata: BlockMetadata): void => {
    console.info(`[validateMetadata] blockName=${blockMetadata.name}`)
    validateSupportedRelease(
        blockMetadata.minimumSupportedRelease,
        blockMetadata.maximumSupportedRelease,
    )
    validatePremiumBlock(blockMetadata)
}

const validatePremiumBlock = (block: BlockMetadata): void => {
    const categories = block.categories ?? []

    if (block.directoryPath?.includes("/ee/") && !categories.includes(BlockCategory.PREMIUM)) {
        throw Error(`[validatePremiumBlock] Premium blocks must be in the 'premium' category`)
    }
    if (categories.includes(BlockCategory.PREMIUM) && (!block.minimumSupportedRelease || semver.lt(block.minimumSupportedRelease, '0.27.1'))) {
        throw Error(`[validatePremiumBlock] Premium blocks must have a minimum supported release of 0.27.1 or higher`)
    }
}

const byDisplayNameIgnoreCase = (a: BlockMetadata, b: BlockMetadata) => {
    const aName = a.displayName.toUpperCase();
    const bName = b.displayName.toUpperCase();
    return aName.localeCompare(bName, 'en');
};

export async function findBlock(blockName: string): Promise<BlockMetadata | null> {
    const blocks = await findAllBlocks()
    return blocks.find((p) => p.name === blockName) ?? null
}

export async function findAllBlocksDirectoryInSource(): Promise<string[]> {
    const blocksPath = resolve(cwd(), 'packages', 'blocks')
    const paths = await traverseFolder(blocksPath)
    const enterpriseBlocksPath = resolve(cwd(), 'packages', 'ee', 'blocks')
    const enterpriseBlocksPaths = await traverseFolder(enterpriseBlocksPath)
    return [...paths, ...enterpriseBlocksPaths]
}

export async function findBlockDirectoryInSource(blockName: string): Promise<string | null> {
    const blocksPath = await findAllBlocksDirectoryInSource();
    const blockPath = blocksPath.find((p) => p.includes(blockName))
    return blockPath ?? null
}

export async function findAllBlocks(): Promise<BlockMetadata[]> {
    const paths = await findAllDistPaths()
    const blocks = await Promise.all(paths.map((p) => loadBlockFromFolder(p)))
    return blocks.filter((p): p is BlockMetadata => p !== null).sort(byDisplayNameIgnoreCase)
}

async function findAllDistPaths(): Promise<string[]> {
    const baseDir = resolve(cwd(), 'dist', 'packages')
    const standardBlocksPath = resolve(baseDir, 'blocks')
    const enterpriseBlocksPath = resolve(baseDir, 'ee', 'blocks')
    const paths = [
        ...await traverseFolder(standardBlocksPath),
        ...await traverseFolder(enterpriseBlocksPath)
    ]
    return paths
}

async function traverseFolder(folderPath: string): Promise<string[]> {
    const paths: string[] = []
    const directoryExists = await stat(folderPath).catch(() => null)

    if (directoryExists && directoryExists.isDirectory()) {
        const files = await readdir(folderPath)

        for (const file of files) {
            const filePath = join(folderPath, file)
            const fileStats = await stat(filePath)
            if (fileStats.isDirectory() && file !== 'node_modules' && file !== 'dist') {
                paths.push(...await traverseFolder(filePath))
            }
            else if (file === 'package.json') {
                paths.push(folderPath)
            }
        }
    }
    return paths
}

async function loadBlockFromFolder(folderPath: string): Promise<BlockMetadata | null> {
    try {
        const packageJson = await readPackageJson(folderPath);

        const module = await import(
            join(folderPath, 'src', 'index')
        )

        const { name: blockName, version: blockVersion } = packageJson
        const block = extractBlockFromModule<Block>({
            module,
            blockName,
            blockVersion
        });

        const metadata = {
            ...block.metadata(),
            name: packageJson.name,
            version: packageJson.version
        };
        metadata.directoryPath = folderPath;
        metadata.name = packageJson.name;
        metadata.version = packageJson.version;
        metadata.minimumSupportedRelease = block.minimumSupportedRelease ?? '0.0.0';
        metadata.maximumSupportedRelease =
            block.maximumSupportedRelease ?? '99999.99999.9999';


        validateMetadata(metadata);
        return metadata;
    }
    catch (ex) {
        console.error(ex)
    }
    return null
}

