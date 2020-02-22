const AWS = require('aws-sdk');

/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = async function arcBucketMacro(arc, cloudformation, stage) {
  const config = arc.s3;
  const buckets = {};
  const aws = new AWS.S3();
  // for each bucket:
  await Promise.all(config.map(b => {
    return new Promise(async (resolve) => {
      let bucketName = b[0];
      if (b.length > 1) {
        // abort if bucket does not match requested stage:
        if (b[0] !== stage) {
          return resolve();
        }
        // bucketname will be "{name}-production" or "{name}-staging"
        // if bucket is marked 'unique' it will have a timestamp appended to the end:
        bucketName = `${b[1]}-${b[0]}${b[2] && b[2].toLowerCase() === 'unique' ? new Date().getTime() : ''}`;
      }
      // see if buckets exist on s3:
      let exists = false;
      const params = {
        Bucket: bucketName,
      };
      try {
        const res = await aws.headBucket({ Bucket: bucketName }).promise();
        exists = true;
      } catch (e) {
        // throws error if bucket does not exist
      }
      // create buckets if it doesn't exist:
      if (!exists) {
        const res = await aws.createBucket({
          Bucket: bucketName
        }).promise();
      }
      // modify arcformation
      cloudformation.Resources.Role.Properties.Policies.push({
        PolicyName: `ArcS3Access-${bucketName}`,
        PolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Action: 's3:*',
            Resource: `arn:aws:s3:::${bucketName}/*`
          }]
        }
      });
      return resolve();
    });
  }));
  return cloudformation
}
