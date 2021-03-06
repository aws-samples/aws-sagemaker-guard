#! /usr/bin/env node
/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/
var config=require('../config')
process.env.AWS_PROFILE=config.profile
process.env.AWS_DEFAULT_REGION=config.profile
var aws=require('aws-sdk')
aws.config.region=require('../config').region
var name=require('./name')
var _=require('lodash')
var cf=new aws.CloudFormation()


module.exports=async function(){
    var stack=name.get()
    var info=await cf.describeStacks({
        StackName:stack
    }).promise()
    var out=_.fromPairs(info.Stacks[0].Outputs
        .map(x=>[x.OutputKey,x.OutputValue]))
    return out
}

if(require.main===module){
    module.exports().then(console.log)
}
