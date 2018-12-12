var fs=require('fs')
var UglifyJS = require("uglify-es");
var chalk=require('chalk')
var _=require('lodash')
var lambdas=fs.readdirSync(__dirname)
    .filter(x=>!x.match(/index.js/))
    .map(x=>[`CFN${x.match(/(.*)\.js/)[1]}Lambda`,lambda(x)])

module.exports=Object.assign(
    _.fromPairs(lambdas),
{
    "CFNLambdaRole":{
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "Path": "/",
        "ManagedPolicyArns": [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess",
            "arn:aws:iam::aws:policy/AWSLambdaFullAccess",
            "arn:aws:iam::aws:policy/AmazonCloudDirectoryFullAccess",
            "arn:aws:iam::aws:policy/AmazonCognitoPowerUser",
            "arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator",
            "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"
        ],
        "Policies":[{
            "PolicyName":"Access",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [{
                    Effect:"Allow",
                    Action:[
                        "cloudformation:*",
                    ],
                    "Resource":"*"
              },{
                  "Effect": "Allow",
                  "Action": [
                    "execute-api:*",
                    "es:*"
                  ],
                  "Resource":["*"]
              }]
            }
        }]
      }
    },
    "CFNLambdaPolicy":{
      "Type": "AWS::IAM::ManagedPolicy",
      "Properties": {
        "PolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [{
              "Effect": "Allow",
              "Action": [
                "execute-api:*",
                "es:*"
              ],
              "Resource":["*"]
          }]
        }
    }},
    "UnzipCodeVersion":{
        "Type": "Custom::S3Version",
        "Properties": {
            "ServiceToken": { "Fn::GetAtt" : ["CFNS3VersionLambda", "Arn"] },
            "Bucket": {"Ref":"AssetBucket"},
            "Key":{"Fn::Sub":"${AssetPrefix}/lambda/unzip.zip"},
            "BuildDate":(new Date()).toISOString()
        }
    },
    "CFNUnzipLambda":{
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
            "S3Bucket":{"Ref":"AssetBucket"},
            "S3Key":{"Fn::Sub":"${AssetPrefix}/lambda/unzip.zip"},
            "S3ObjectVersion":{"Ref":"UnzipCodeVersion"},
        },
        "Handler": "index.handler",
        "MemorySize": "128",
        "Role": {"Fn::GetAtt": ["APILambdaRole","Arn"]},
        "Runtime": "nodejs6.10",
        "TracingConfig":{
            "Mode":"Active"
        },
        "Timeout": 60,
        "Tags":[{
            Key:"Type",
            Value:"ApiRouteHandler"
        }]
      }
    }
})

function lambda(name){
    var code=fs.readFileSync(__dirname+`/${name}`,'utf-8')
    var result = UglifyJS.minify(code,{mangle:false});
    if(result.error) throw `${name} ${result.error}`
    if(result.code.length<4096){
        console.log(`CFN:${name}`, chalk.green(`${result.code.length}/4096`))
    }else{
        console.log(`CFN:${name}`, chalk.red(`${result.code.length}/4096`))
    }
   
    return {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
            "ZipFile":code
        },
        "Handler": "index.handler",
        "MemorySize": "128",
        "Role": {"Fn::GetAtt": ["CFNLambdaRole","Arn"]},
        "Runtime": "nodejs6.10",
        "Timeout": 60,
        "Tags":[{
            Key:"Type",
            Value:"CustomResource"
        }]
      }
    }
}



