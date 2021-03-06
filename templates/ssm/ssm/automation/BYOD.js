var _=require('lodash')
module.exports={
  "schemaVersion": "0.3",
  "description": {"Fn::Sub":"OnCreate Document. Installs and configures the aws-samples/amazon-sagemaker-BYOD-template project on the instance."},
  assumeRole:{"Fn::GetAtt":["SSMAutomationRole","Arn"]},
  "parameters": require('../params'),
  "mainSteps": [
    {
        "name":"choice",
        "action":"aws:branch",
        "inputs":{
            Choices:[{
                Variable:"{{Event}}",
                StringEquals:"Create",
                NextStep:"create"
            },{
                Variable:"{{Event}}",
                StringEquals:"Delete",
                NextStep:"delete"
            }]
        }
    },
    {
      "action": "aws:createStack",
      "nextStep":"install",
      "name": "create",
      "inputs": {
        StackName:"{{StackName}}-bucket",
        TemplateURL:{"Fn::Sub":"https://s3.amazonaws.com/${AssetBucket}/${AssetPrefix}/bucket.json"},
        Capabilities:["CAPABILITY_IAM"],
        Parameters:[{
            ParameterValue:"{{RoleArn}}",
            ParameterKey:"RoleArn",
        },{
            ParameterValue:"{{StackName}}",
            ParameterKey:"NotebookInstance",
        }]
      }
    },
    {
      "action": "aws:runCommand",
      "name": "install",
      isEnd:true,
      "inputs": {
        DocumentName:{"Ref":"BYODCommandDocument"},
        InstanceIds:["{{InstanceId}}"],
        OutputS3BucketName:"{{LogsBucket}}",
        OutputS3KeyPrefix:"BYOD",
        Parameters:{
            BucketStack:"{{StackName}}-bucket",
            Region:"{{global:REGION}}"
        }
      }
    },
    {
      "action": "aws:deleteStack",
      "name": "delete",
      "isEnd":true,
      "inputs": {
        StackName:"{{StackName}}-bucket",
      }
    }
  ],
  Tags:{
    "OnCreateDelete":"true",
  }
}
