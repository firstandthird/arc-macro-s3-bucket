/**
 * @param {object} arc - the parsed .arc file currently executing
 * @param {object} cloudformation - the current AWS::Serverless CloudFormation template
 * @param {object} stage - the application stage (one of `staging` or `production`)
 */
module.exports = function arcBucketMacro(arc, cloudformation, stage) {
  // check bucket names in arc for staging/prod
  // see if buckets exist on s3
  // create buckets if they don't
  // modify cloudformation.Resources here
  return cloudformation
}
