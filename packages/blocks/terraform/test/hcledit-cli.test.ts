jest.mock('@openops/server-shared');

const mockWriteFile = jest.fn();
const mockExecuteCommand = jest.fn();

const fsMock = {
  ...jest.requireActual('node:fs/promises'),
  writeFile: mockWriteFile,
};

const commonMock = {
  ...jest.requireActual('@openops/common'),
  executeCommand: mockExecuteCommand,
};

jest.mock('node:fs/promises', () => fsMock);
jest.mock('@openops/common', () => commonMock);

import {
  deleteResource,
  getResources,
  listBlocksCommand,
  updateResourceProperties,
  updateVariablesFile,
} from '../src/lib/hcledit-cli';

describe('Get Resources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should get resources successfully', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      stdOut:
        'resource.aws_instance.example\nresource.aws_ebs_volume.example_volume\nresource.aws_volume_attachment.example_attach\nresource.aws_db_instance.example_rds',
      stdError: '',
    });

    const resources = await getResources(testTemplate);

    expect(resources).toMatchObject([
      { name: 'example', type: 'aws_instance' },
      { name: 'example_volume', type: 'aws_ebs_volume' },
      { name: 'example_attach', type: 'aws_volume_attachment' },
      { name: 'example_rds', type: 'aws_db_instance' },
    ]);

    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
  });

  test('should return empty list when template has no resources', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      stdOut: '',
      stdError: '',
    });

    const resources = await getResources(testTemplate);

    expect(resources).toMatchObject([]);
    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      '/bin/bash',
      expect.arrayContaining([
        expect.stringContaining('block get resource | hcledit block list'),
      ]),
    );
  });

  test('should throw an error if get resources command fails', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      stdOut: '',
      stdError: 'Error',
    });

    await expect(getResources('template')).rejects.toThrow(
      'Failed to execute the command to get resources.',
    );
  });
});

describe('Update Resource Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ['t2.nano', '\\"t2.nano\\"', 'NewName', '\\"NewName\\"'],
    ['true', 'true', 'false', 'false'],
    ['15', '15', '10', '10'],
  ])(
    'should update resource property successfully',
    async (
      setPropertyValue: string,
      setPropertyValueExpected: string,
      appendPropertyValue: string,
      appendPropertyValueExpected: string,
    ) => {
      const modifications = [
        { propertyName: 'property_name1', propertyValue: setPropertyValue },
        { propertyName: 'property_name2', propertyValue: appendPropertyValue },
      ];

      mockExecuteCommand
        .mockResolvedValueOnce({
          exitCode: 0,
          stdOut: 't2.micro',
          stdError: '',
        })
        .mockResolvedValueOnce({ exitCode: 0, stdOut: '', stdError: '' })
        .mockResolvedValueOnce({ exitCode: 0, stdOut: 'result', stdError: '' });

      const result = await updateResourceProperties(
        testTemplate,
        'aws_instance',
        'example',
        modifications,
      );

      expect(result).toContain('result');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockExecuteCommand).toHaveBeenCalledTimes(3);

      expect(mockExecuteCommand).toHaveBeenNthCalledWith(
        1,
        '/bin/bash',
        expect.arrayContaining([
          expect.stringContaining(
            'attribute get resource.aws_instance.example.property_name1',
          ),
        ]),
      );
      expect(mockExecuteCommand).toHaveBeenNthCalledWith(
        2,
        '/bin/bash',
        expect.arrayContaining([
          expect.stringContaining(
            'attribute get resource.aws_instance.example.property_name2',
          ),
        ]),
      );
      expect(mockExecuteCommand).toHaveBeenNthCalledWith(
        3,
        '/bin/bash',
        expect.arrayContaining([
          expect.stringContaining(
            `attribute set resource.aws_instance.example.property_name1 ${setPropertyValueExpected} | hcledit attribute append resource.aws_instance.example.property_name2 ${appendPropertyValueExpected}`,
          ),
        ]),
      );
    },
  );

  test('should throw an error if update command fails', async () => {
    const modifications = [
      { propertyName: 'BucketName', propertyValue: 'NewName' },
    ];

    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      stdOut: '',
      stdError: 'Error',
    });

    await expect(
      updateResourceProperties(
        testTemplate,
        'aws_instance',
        'example',
        modifications,
      ),
    ).rejects.toThrow(
      'Failed to modify the template. {"exitCode":1,"stdOut":"","stdError":"Error"}',
    );
  });
});

describe('Delete Resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete resource from stack successfully', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      stdOut: 'result',
      stdError: '',
    });

    const result = await deleteResource(
      testTemplate,
      'aws_instance',
      'example',
    );

    expect(result).toContain('result');
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      '/bin/bash',
      expect.arrayContaining([
        expect.stringContaining('block rm resource.aws_instance.example'),
      ]),
    );
  });

  test('should throw an error if delete command fails', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      stdOut: '',
      stdError: 'Error',
    });

    await expect(
      deleteResource(testTemplate, 'aws_instance', 'example'),
    ).rejects.toThrow(
      'Failed to modify the template. {"exitCode":1,"stdOut":"","stdError":"Error"}',
    );
  });
});

describe('Update Variables File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update variables file successfully', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      stdOut: 'ok',
      stdError: '',
    });

    const result = await updateVariablesFile(`a = 1`, [
      { variableName: 'a', variableValue: 2 },
      { variableName: 'b', variableValue: 'str' },
      { variableName: 'c', variableValue: true },
    ]);

    expect(result).toContain('ok');
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      '/bin/bash',
      expect.arrayContaining([
        '-c',
        expect.stringContaining(
          "attribute set a '2' | hcledit attribute set b '\"str\"' | hcledit attribute set c 'true'",
        ),
      ]),
    );
  });

  test('should throw an error if variables update fails', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      stdOut: '',
      stdError: 'err',
    });

    await expect(
      updateVariablesFile('a=1', [{ variableName: 'a', variableValue: 3 }]),
    ).rejects.toThrow(
      'Failed to modify the template. {"exitCode":1,"stdOut":"","stdError":"err"}',
    );
  });
});

describe('List Blocks Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should list blocks successfully', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      stdOut: 'block.aws_instance.example',
      stdError: '',
    });

    const result = await listBlocksCommand(testTemplate);

    expect(result.exitCode).toBe(0);
    expect(result.stdOut).toContain('block.aws_instance.example');
    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      '/bin/bash',
      expect.arrayContaining([expect.stringContaining('block list')]),
    );
  });
});

const testTemplate = `
  provider "aws" {
    region = "us-west-2"
  }

  resource "aws_instance" "example" {
    ami           = "ami-0c55b159cbfafe1f0"
    instance_type = "t2.micro"
    subnet_id     = "subnet-xxxxxxxx"

    tags = {
      Name = "example-instance"
    }
  }

  resource "aws_ebs_volume" "example_volume" {
    availability_zone = aws_instance.example.availability_zone
    size              = 10

    tags = {
      Name = "example-volume"
    }
  }

  resource "aws_volume_attachment" "example_attach" {
    device_name = "/dev/sdh"
    volume_id   = aws_ebs_volume.example_volume.id
    instance_id = aws_instance.example.id
  }

  resource "aws_db_instance" "example_rds" {
    allocated_storage    = 20
    engine               = "mysql"
    instance_class       = "db.t2.micro"
    name                 = "exampledb"
    username             = "admin"
    password             = "password"
    parameter_group_name = "default.mysql8.0"
    skip_final_snapshot  = true

    tags = {
      Name = "example-rds"
    }
  }
`;
