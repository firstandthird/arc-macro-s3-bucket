/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = function arcBucketMacro(arc, cloudformation, stage) {
  if (!arc.s3) {
    return cloudformation;
  }

  cloudformation.Resources.ArcS3Bucket = {
    Type: 'AWS::S3::Bucket'
  };
  if (arc.s3[0] === 'versioning') {
    cloudformation.Resources.ArcS3Bucket.Properties = {
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    };
  }

  Object.entries(cloudformation.Resources).forEach(([key, value]) => {
    if (value.Type && value.Type === 'AWS::Serverless::Function') {
      cloudformation.Resources[key].Properties.Environment.Variables.S3_BUCKET = { Ref: 'ArcS3Bucket' };
    }
  });
  cloudformation.Resources.Role.Properties.Policies.push({
    PolicyName: 'ArcS3BucketAccess',
    PolicyDocument: {
      Statement: [{
        Effect: 'Allow',
        Action: 's3:*',
        Resource: [
          { 'Fn::GetAtt': ['ArcS3Bucket', 'Arn'] },
          { 'Fn::Join': ['', [
            { 'Fn::GetAtt': ['ArcS3Bucket', 'Arn'] },
            '/*'
          ]]
          }
        ]
      }]
    }
  });
  cloudformation.Outputs.s3Bucket = {
    Description: 'S3 Bucket',
    Value: {
      Ref: 'ArcS3Bucket'
    }
  };

  return cloudformation;
};
