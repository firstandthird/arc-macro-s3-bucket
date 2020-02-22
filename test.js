// a simple test, you can manually verify
const tap = require('tap');
const arcBucketMacro = require('./index.js');
const AWS = require('aws-sdk');

tap.test('load cloudformation', async t => {
  const arc = { s3: [
    ['staging', 'no-real-bucketeh'],
    ['staging', 'no-real-bucketeh', 'unique'],
    ['production', 'should-not-exist', 'unique'],
  ]};
  const cloudformation = {
    Resources: {
      Role: {
        Properties: {
          Policies: []
        }
      }
    }
  };
  const result = await arcBucketMacro(arc, cloudformation, 'staging')
  t.equal(result.Resources.Role.Properties.Policies.length, 2);
  const aws = new AWS.S3();
  try {
    await aws.headBucket({ Bucket: 'no-real-bucketeh-staging' }).promise();
  } catch (e) {
    console.log(e);
    t.fail();
  }
  try {
    const res = await aws.headBucket({ Bucket: 'should-not-exist' }).promise();
    t.fail();
  } catch (e) {
    // error is supposed to occur here
  }
  t.match(result.Resources.Role.Properties.Policies[0].PolicyDocument.Statement[0],
  {
    Resource: 'arn:aws:s3:::no-real-bucketeh-staging/*'
  });
  t.end();
});
