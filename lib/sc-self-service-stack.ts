import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ScProductBucket } from './sc-products-stack';
import * as sc from 'aws-cdk-lib/aws-servicecatalog';
import * as cr from 'aws-cdk-lib/custom-resources';

export class ScSelfServiceStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const params = this.node.tryGetContext('Parameters');
    const tagOptions = this.node.tryGetContext('TagOptions');

    // SC Portfolio
    const portfolio = new sc.Portfolio(this, 'Portfolio1', {
      displayName: params.PortfolioName,
      description: 'Compiant AWS resources',
      providerName: params.Provider,
      tagOptions: new sc.TagOptions(this, 'TagOptionsPf', {
        allowedValuesForTags: tagOptions.Portfolio
      })
    });

    // Custom resource to get Organization ID
    const describeOrg = new cr.AwsCustomResource(this, 'DescribeOrganization', {
      onUpdate: {
        service: 'Organizations',
        action: 'describeOrganization',
        region: 'us-east-1',
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    // Custom resource to share Portfolio with Organization
    const createShare = new cr.AwsCustomResource(this, 'CreatePortfolioShare', {
      onUpdate: {
        service: 'ServiceCatalog',
        action: 'createPortfolioShare',
        parameters: {
          PortfolioId: portfolio.portfolioId,
          OrganizationNode: {
            Type: 'ORGANIZATION',
            Value: describeOrg.getResponseField('Organization.Id')
          },
          ShareTagOptions: true
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    // List of SC Products
    const products: sc.IProduct[] = [
      new sc.CloudFormationProduct(this, 'Product1', {
        productName: "Private S3 Bucket",
        description: "S3 Bucket with encryption and versioning",
        owner: params.Owner,
        distributor: params.Distributor,
        supportUrl: params.Support.Url,
        supportEmail: params.Support.Email,
        tagOptions: new sc.TagOptions(this, 'TagOptionsPr', {
          allowedValuesForTags: tagOptions.Product
        }),
        productVersions: [{
          productVersionName: "0.1",
          cloudFormationTemplate: sc.CloudFormationTemplate.fromProductStack(
            new ScProductBucket(this, 'ScProductBucket')
          )
        }]
      })
    ]

    // Add all Products to Portfolio
    for (const product of products) {
      portfolio.addProduct(product);
    }

  }
}
