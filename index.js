const AWS = require('aws-sdk');
const caps = require('lodash.capitalize');

/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = async function arcBucketMacro(arc, cloudformation, stage) {
  const config = arc.s3;
  const buckets = {};
  // get the paths with the correct name formatting:
  const paths = arc.http.map(list => {
    return list.map(component => {
      const p = component.replace(/\//g, '');
      const pList = p.split(':');
      return pList.map(caps).join('')
    }).join('');
  });
  let mainBucket;
  arc.aws.forEach(f => {
    if (f[0] === 'bucket') {
      mainBucket = f[1];
    }
  });
  mainBucket = process.env.S3_BUCKET || mainBucket;
  paths.map(p => {
    if (p === 'Get') {
      p = 'GetIndex';
    }
    if (cloudformation.Resources[p]) {
      cloudformation.Resources[p].Properties.Environment.Variables.S3_BUCKET = mainBucket;
    }
  })
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
        bucketName = `${b[1]}${b[2] && b[2].toLowerCase() === 'unique' ? new Date().getTime() : ''}`;
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
      const env = process.env.S3_BUCKET || '';
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
