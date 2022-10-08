import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sc from 'aws-cdk-lib/aws-servicecatalog';
import * as s3 from 'aws-cdk-lib/aws-s3';

class ScProductBucket extends sc.ProductStack {

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

export class ScSelfServiceStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tagOptions = this.node.tryGetContext('TagOptions');
    const shareAccounts = this.node.tryGetContext('ShareAccounts');

    const portfolio = new sc.Portfolio(this, 'Portfolio1', {
      displayName: 'CDK Self-Service',
      description: 'Compiant AWS resources',
      providerName: 'CCoE',
      tagOptions: new sc.TagOptions(this, 'TagOptionsPf', {
        allowedValuesForTags: tagOptions.Portfolio
      })
    });

    for (const account of shareAccounts) {
      portfolio.shareWithAccount(account);
    }

    const product = new sc.CloudFormationProduct(this, 'Product1', {
      productName: "Private S3 Bucket",
      description: "S3 Bucket with encryption and versioning",
      owner: "Chmoora",
      distributor: "CCoE",
      supportUrl: "https://aws.chmoora.net/support",
      supportEmail: "aws-support@chmoora.net",
      tagOptions: new sc.TagOptions(this, 'TagOptionsPr', {
        allowedValuesForTags: tagOptions.Product
      }),
      productVersions: [{
        productVersionName: "0.1",
        cloudFormationTemplate: sc.CloudFormationTemplate.fromProductStack(
          new ScProductBucket(this, 'ScProductBucket')
        )
      }]
    });

  }
}
