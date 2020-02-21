const AWS = require('aws-sdk');

/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = function async arcBucketMacro(arc, cloudformation, stage) {
  const config = arc.s3;
  const buckets = {};
  const aws = new AWS.S3();
  // for each bucket:
  config.forEach(b => {
    let bucketName = b[0];
    if (b.length === 1) {
      // bucketname will be "{name}-production" or "{name}-staging"
      // if bucket is marked 'unique' it will have a timestamp appended to the end:
      bucketName = `${b[1]}-${b[0]}-${b[2] && b[2].toLowerCase() === 'unique' ? new Date().getTime() : ''}`;
    }
    // see if buckets exist on s3:
    let exists = false;
    const params = {
      Bucket: bucketName,
    };
    try {
      await aws.headBucket({ Bucket: bucketName }).promise();
      exists = true;
    } catch (e) {
    }
    // create buckets if it doesn't exist:
    await aws.createBucket({
      Bucket: bucketName
      /*
      // any config options here?
      */
    });
    // modify arcformation
    cloudformation.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcS3Access',
      PolicyDocument: {
        Statement: [{
          Effect: 'Allow',
          Action: 's3:*',
          Resource: '*'
        }]
      }
    });
  });
  return cloudformation
}
