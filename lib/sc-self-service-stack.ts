import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ScProductBucket } from './sc-products-stack';
import * as sc from 'aws-cdk-lib/aws-servicecatalog';
import * as cr from 'aws-cdk-lib/custom-resources';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';

export class ScSelfServiceStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const params = this.node.tryGetContext('Parameters');
    const tagOptions = this.node.tryGetContext('TagOptions');

    // SC Portfolio
    const portfolio = new sc.Portfolio(this, 'Portfolio1', {
      displayName: params.PortfolioName,
      description: 'Shared Products',
      providerName: params.Provider,
      tagOptions: new sc.TagOptions(this, 'TagOptionsPf', {
        allowedValuesForTags: tagOptions.Portfolio
      })
    });

    // Custom resource to get Organization ID
    const describeOrg = new cr.AwsCustomResource(this, 'OrganizationInfo', {
      onUpdate: {
        service: 'Organizations',
        action: 'describeOrganization',
        region: 'us-east-1',
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onDelete: {
        service: 'Organizations',
        action: 'describeOrganization',
        region: 'us-east-1',
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    const orgNode = {
      Type: 'ORGANIZATION',
      Value: describeOrg.getResponseField('Organization.Id')
    };

    // Custom resource to share Portfolio with Organization
    const createShare = new cr.AwsCustomResource(this, 'PortfolioShare', {
      onCreate: {
        service: 'ServiceCatalog',
        action: 'createPortfolioShare',
        region: this.region,
        parameters: {
          PortfolioId: portfolio.portfolioId,
          OrganizationNode: orgNode,
          ShareTagOptions: true
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onUpdate: {
        service: 'ServiceCatalog',
        action: 'updatePortfolioShare',
        region: this.region,
        parameters: {
          PortfolioId: portfolio.portfolioId,
          OrganizationNode: orgNode,
          ShareTagOptions: true
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onDelete: {
        service: 'ServiceCatalog',
        action: 'deletePortfolioShare',
        parameters: {
          PortfolioId: portfolio.portfolioId,
          OrganizationNode: orgNode
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        // Grant access to portfolio sharing
        new PolicyStatement({
          actions: [ 'servicecatalog:*PortfolioShare*' ],
          resources: [ portfolio.portfolioArn ]
        }),
        // Grant read access to Organization's objects
        new PolicyStatement({
          actions: [ 
            'organizations:ListAccount*',
            'organizations:ListChildren',
            'organizations:ListOrganization*',
            'organizations:DescribeAccount',
            'organizations:DescribeOrganization*'
          ],
          resources: [ '*' ]
        })
      ])
    });
    
    // Give access to list of IAM roles
    for (const roleName of params.RoleAccess) {
      portfolio.giveAccessToRole(Role.fromRoleName(this, `${roleName}Access`, roleName));
    }

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

    // Add all Products to Portfolio and add launch constrains
    for (const product of products) {
      portfolio.addProduct(product);
      portfolio.setLocalLaunchRoleName(product, params.Provisioning.RoleName);
    }

    // CF Outputs
    new cdk.CfnOutput(this, 'PortfolioId', { value: portfolio.portfolioId });
    new cdk.CfnOutput(this, 'OrganizationId', { value: describeOrg.getResponseField('Organization.Id') });

  }
}
