var response = require('cfn-response')
var https = require("https");
var url = require("url");
var aws=require('aws-sdk')
aws.config.region=process.env.AWS_REGION
var clouddirectory=new aws.CloudDirectory()

exports.handler=function(event,context,callback){
    console.log(JSON.stringify(event,null,2))
    var params=event.ResourceProperties
    delete params.ServiceToken
    
    new Promise(function(res,rej){
        if(event.RequestType==="Create" || event.RequestType==="Update"){
            return clouddirectory.createDirectory(params).promise()
            .then(function(result){
                send("SUCCESS",result,result.DirectoryArn)
                res()
            })
        }else if(event.RequestType==="Delete"){
            return clouddirectory.disableDirectory({
                DirectoryArn:event.PhysicalResourceId
            }).promise()
            .then(()=>clouddirectory.deleteDirectory({
                DirectoryArn:event.PhysicalResourceId
            }).promise())
            .then(function(){
                send("SUCCESS",{},event.PhysicalResourceId)
                res()
            }).catch(rej)
        }
    })
    .catch(function(e){
        console.log(e)
        send("FAILED",{},event.PhysicalResourceId,e.toString())
    })

    function send(responseStatus, responseData, physicalResourceId,reason) {
     
        var responseBody = JSON.stringify({
            Status: responseStatus,
            Reason:reason,
            PhysicalResourceId: physicalResourceId || context.logStreamName,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            Data: responseData
        });
     
        console.log("Response body:\n", responseBody);
     
        var https = require("https");
        var url = require("url");
     
        var parsedUrl = url.parse(event.ResponseURL);
        var options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: "PUT",
            headers: {
                "content-type": "",
                "content-length": responseBody.length
            }
        };
     
        var request = https.request(options, function(response) {
            console.log("Status code: " + response.statusCode);
            console.log("Status message: " + response.statusMessage);
            context.done();
        });
     
        request.on("error", function(error) {
            console.log("send(..) failed executing https.request(..): " + error);
            context.done();
        });
     
        request.write(responseBody);
        request.end();
    }
}
