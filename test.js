// a simple test, you can manually verify
const tap = require('tap');
const arcBucketMacro = require('./index.js');
const AWS = require('aws-sdk');

tap.test('load cloudformation', async t => {
  const arc = {
    s3: [
      ['staging', 'no-real-bucketeh'],
      ['staging', 'no-real-bucketeh', 'unique'],
      ['production', 'should-not-exist', 'unique'],
    ],
    http: [['get', '/']],
    aws: [['bucket', 'a-bucket']]
  };
  const cloudformation = {
    Resources: {
      GetIndex: {
        Properties: {
          Environment: {
            Variables: {
            }
          }
        }
      },
      Role: {
        Properties: {
          Policies: []
        }
      }
    }
  };
  const result = arcBucketMacro(arc, cloudformation, 'staging')
  t.equal(result.Resources.Role.Properties.Policies.length, 2);
  t.ok(result.Resources['no-real-bucketeh'])
  t.match(result.Resources['GetIndex'].Properties.Environment.Variables.S3_BUCKET, process.env.S3_BUCKET || 'a-bucket');
  t.end();
});
