const AWS = require('aws-sdk');
const caps = require('lodash.capitalize');

/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = function arcBucketMacro(arc, cloudformation, stage) {
  const config = arc.s3;
  const buckets = {};
  // set the S3_BUCKET env variable for every lambda we create
  // first get the correct path names with the correct formatting:
  const paths = arc.http.map(list => {
    return list.map(component => {
      const p = component.replace(/\//g, '');
      const pList = p.split(':');
      return pList.map(caps).join('')
    }).join('');
  });
  let s3Bucket;
  arc.aws.forEach(f => {
    if (f[0] === 'bucket') {
      s3Bucket = f[1];
    }
  });
  s3Bucket = process.env.S3_BUCKET || s3Bucket;
  // loop over every path and set the ENV var:
  paths.map(p => {
    if (p === 'Get') {
      p = 'GetIndex';
    }
    if (cloudformation.Resources[p]) {
      cloudformation.Resources[p].Properties.Environment.Variables.S3_BUCKET = s3Bucket;
    }
  })
  const aws = new AWS.S3();
  // for each bucket:
  config.map(async b => {
    let bucketName = b[0];
    if (b.length > 1) {
      // abort if bucket does not match requested stage:
      if (b[0] !== stage) {
        return;
      }
      // bucketname will be "{name}-production" or "{name}-staging"
      // if bucket is marked 'unique' it will have a timestamp appended to the end:
      bucketName = `${b[1]}${b[2] && b[2].toLowerCase() === 'unique' ? new Date().getTime() : ''}`;
    }
    cloudformation.Resources[bucketName] = {
      Type: "AWS::S3::Bucket",
      Properties: {
        BucketName: bucketName,
        // todo: any other properties we want?
      }
    };
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
  });
  return cloudformation
}
