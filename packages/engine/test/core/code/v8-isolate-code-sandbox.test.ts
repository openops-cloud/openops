import { v8IsolateCodeSandbox } from '../../../src/lib/core/code/v8-isolate-code-sandbox'

const runScript = (script: string): Promise<unknown> =>
    v8IsolateCodeSandbox.runScript({ script, scriptContext: {} })

describe('v8IsolateCodeSandbox base64 polyfill', () => {
    it('exposes btoa that matches Latin1 base64 encoding', async () => {
        const result = await runScript("btoa('hello world')")
        expect(result).toBe(Buffer.from('hello world', 'latin1').toString('base64'))
    })

    it('exposes atob that decodes base64 back to the original string', async () => {
        const encoded = Buffer.from('hello world', 'latin1').toString('base64')
        const result = await runScript(`atob('${encoded}')`)
        expect(result).toBe('hello world')
    })

    it('round-trips a value through btoa and atob', async () => {
        const result = await runScript("atob(btoa('ServiceNow ticket #42'))")
        expect(result).toBe('ServiceNow ticket #42')
    })

    it('decodes a base64-encoded ServiceNow batch response body', async () => {
        const body = Buffer.from(
            JSON.stringify({ result: { sys_id: 'abc123def456' } }),
            'latin1',
        ).toString('base64')
        const result = await runScript(
            `JSON.parse(atob('${body}')).result.sys_id`,
        )
        expect(result).toBe('abc123def456')
    })

    it('throws when btoa receives characters outside the Latin1 range', async () => {
        await expect(runScript("btoa('日本語')")).rejects.toThrow(/Latin1 range/)
    })
})
