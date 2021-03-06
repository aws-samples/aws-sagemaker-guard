#! /usr/bin/env node
var check=require('./check')
var aws=require('aws-sdk')
var config=require('../config')
var cf=new aws.CloudFormation({region:config.region})
var name=require('./name')
var wait=require('./wait')
var bucket=config.templateBucket
var prefix=config.templatePrefix
if(require.main===module){
    run()
}

async function run(){
    console.log(process.argv)
    var template=await check()
    var result=await cf.updateStack({
        StackName:process.argv[2] || await name.get(),
        Capabilities:["CAPABILITY_NAMED_IAM"],
        TemplateURL:`http://s3.amazonaws.com/${bucket}/${prefix}/${config.name}.json`,
        Parameters:Object.keys(config.parameters)
            .map(param=>{return{
                ParameterKey:param,
                ParameterValue:config.parameters[param]
            }})

    }).promise()
    .then(()=>console.log((new Date()).toLocaleTimeString()))
    await wait()
}
