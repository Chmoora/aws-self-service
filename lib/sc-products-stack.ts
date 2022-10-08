import { Construct } from 'constructs';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class ScProductBucket extends ProductStack {

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new s3.Bucket(this, 'PrivateBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      enforceSSL: true,
      versioned: true
    });

  }
}