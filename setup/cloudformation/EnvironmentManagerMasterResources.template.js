'use strict';

module.exports = function ({ managedAccounts }) {
    managedAccounts = Array.from(new Set(managedAccounts || []));

    return {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Network and Compute resources for Environment Manager",
        "Parameters": {
            "pResourcePrefix": {
                "Type": "String",
                "Description": "Prefix for named AWS resources",
                "Default": ""
            },
            "pConfigurationBucket": {
                "Type": "String",
                "Default": "",
                "Description": "S3 bucket for Environment Manager configuration.",
                "MinLength": "0"
            },
            "pSecretsBucket": {
                "Type": "String",
                "Default": "",
                "Description": "S3 bucket for secrets.",
                "MinLength": "0"
            },
            "pBackupsBucket": {
                "Type": "String",
                "Default": "",
                "Description": "S3 bucket for backups.",
                "MinLength": "0"
            },
            "pDeploymentLogsBucket": {
                "Type": "String",
                "Default": "",
                "Description": "S3 bucket for deployment logs.",
                "MinLength": "0"
            },
            "pPackagesBucket": {
                "Type": "String",
                "Default": "",
                "Description": "S3 bucket for deployable packages.",
                "MinLength": "0"
            },
            "pEc2KeyPair": {
                "Description": "Name of the EC2 key pair for the Environment Manager servers.",
                "Type": "AWS::EC2::KeyPair::KeyName"
            },
            "ploadBalancerEnvironmentManagerTimeOut": {
                "Description": "Connection timeout for EnvironmentManager LoadBalancer",
                "Type": "Number",
                "Default": 60
            },
            "ploadBalancerEnvironmentManagerPort": {
                "Description": "EnvironmentManager HTTPS port",
                "Type": "String",
                "Default": "40500"
            },
            "pLoadBalancerListenPort": {
                "Description": "ELB listens on this port",
                "Type": "String",
                "Default": "80"
            },
            "pConsulPort": {
                "Description": "Consul listens on this port",
                "Type": "String",
                "Default": "8500"
            },
            "ploadBalancerEnvironmentManagerHealthCheck": {
                "Description": "EnvironmentManager Health Check target API",
                "Type": "String",
                "Default": "/api/v1/diagnostics/healthcheck"
            },
            "ploadBalancerEnvironmentManagerSubnetIDs": {
                "Description": "List of Subnet IDs for EnvironmentManager LoadBalancer",
                "Type": "List<AWS::EC2::Subnet::Id>"
            },
            "pVpcBase": {
                "Type": "AWS::EC2::VPC::Id",
                "Description": "VPC ID, syntax vpc-xxxxxxxx"
            },
            "pInternalSubnet": {
                "Description": "Internal subnet (CIDR block)",
                "Type": "String"
            },
            "pEnvironmentManagerSecurityGroups": {
                "Type": "List<AWS::EC2::SecurityGroup::Id>",
                "Description": "Security groups to allow sysadmin and Consul cluster access to EC2 instances"
            },
            "pCreateMasterRole": {
                "Type": "String",
                "Default": "false",
                "Description": "Create roleInfraEnvironmentManager?",
                "AllowedValues": [
                    "false",
                    "true"
                ]
            },
            "pAlertSNSTopic": {
                "Type": "String",
                "Description": "SNS Topic ARN for lambda alerts."
            }
        },
        "Conditions": {
            "CreateMasterRole": {
                "Fn::Equals": [
                    {
                        "Ref": "pCreateMasterRole"
                    },
                    "true"
                ]
            }
        },
        "Resources": {
            "loadBalancerEnvironmentManager": {
                "Type": "AWS::ElasticLoadBalancing::LoadBalancer",
                "Properties": {
                    "ConnectionDrainingPolicy": {
                        "Enabled": true,
                        "Timeout": {
                            "Ref": "ploadBalancerEnvironmentManagerTimeOut"
                        }
                    },
                    "ConnectionSettings": {
                        "IdleTimeout": {
                            "Ref": "ploadBalancerEnvironmentManagerTimeOut"
                        }
                    },
                    "CrossZone": true,
                    "HealthCheck": {
                        "HealthyThreshold": "2",
                        "Interval": "5",
                        "Target": {
                            "Fn::Join": [
                                "",
                                [
                                    "HTTP:",
                                    {
                                        "Ref": "ploadBalancerEnvironmentManagerPort"
                                    },
                                    {
                                        "Ref": "ploadBalancerEnvironmentManagerHealthCheck"
                                    }
                                ]
                            ]
                        },
                        "Timeout": "3",
                        "UnhealthyThreshold": "5"
                    },
                    "LoadBalancerName": { "Fn::Sub": "${pResourcePrefix}environmentmanager-elb" },
                    "Listeners": [
                        {
                            "InstancePort": {
                                "Ref": "ploadBalancerEnvironmentManagerPort"
                            },
                            "InstanceProtocol": "HTTP",
                            "LoadBalancerPort": {
                                "Ref": "pLoadBalancerListenPort"
                            },
                            "Protocol": "HTTP"
                        }
                    ],
                    "Scheme": "internal",
                    "SecurityGroups": [
                        {
                            "Ref": "sgInfraEnvironmentManagerElb"
                        }
                    ],
                    "Subnets": {
                        "Ref": "ploadBalancerEnvironmentManagerSubnetIDs"
                    }
                }
            },
            "sgInfraEnvironmentManager": {
                "Type": "AWS::EC2::SecurityGroup",
                "Properties": {
                    "GroupDescription": "Security Group for Environment Manager",
                    "VpcId": {
                        "Ref": "pVpcBase"
                    },
                    "Tags": [
                        {
                            "Key": "Name",
                            "Value": { "Fn::Sub": "${pResourcePrefix}sgInfraEnvironmentManager" }
                        }
                    ]
                }
            },
            "sgiInfraEnvironmentManagerTcp40500fromSgInfraEnvironmentManagerElb": {
                "Type": "AWS::EC2::SecurityGroupIngress",
                "Properties": {
                    "GroupId": {
                        "Ref": "sgInfraEnvironmentManager"
                    },
                    "IpProtocol": "tcp",
                    "SourceSecurityGroupId": {
                        "Ref": "sgInfraEnvironmentManagerElb"
                    },
                    "FromPort": {
                        "Ref": "ploadBalancerEnvironmentManagerPort"
                    },
                    "ToPort": {
                        "Ref": "ploadBalancerEnvironmentManagerPort"
                    }
                }
            },
            "sgInfraEnvironmentManagerElb": {
                "Type": "AWS::EC2::SecurityGroup",
                "Properties": {
                    "GroupDescription": "Security Group for Environment Manager ELB",
                    "VpcId": {
                        "Ref": "pVpcBase"
                    },
                    "Tags": [
                        {
                            "Key": "Name",
                            "Value": { "Fn::Sub": "${pResourcePrefix}sgInfraEnvironmentManagerElb" }
                        }
                    ]
                }
            },
            "sgiInfraEnvironmentManagerElbTcp443fromInternalSubnet": {
                "Type": "AWS::EC2::SecurityGroupIngress",
                "Properties": {
                    "GroupId": {
                        "Ref": "sgInfraEnvironmentManagerElb"
                    },
                    "IpProtocol": "tcp",
                    "CidrIp": {
                        "Ref": "pInternalSubnet"
                    },
                    "FromPort": {
                        "Ref": "pLoadBalancerListenPort"
                    },
                    "ToPort": {
                        "Ref": "pLoadBalancerListenPort"
                    }
                }
            },
            "launchConfigEnvironmentManager": {
                "Type": "AWS::AutoScaling::LaunchConfiguration",
                "Properties": {
                    "BlockDeviceMappings": [
                        {
                            "DeviceName": "/dev/sda1",
                            "Ebs": {
                                "VolumeType": "gp2",
                                "VolumeSize": 35
                            }
                        },
                        {
                            "DeviceName": "/dev/sda2",
                            "Ebs": {
                                "VolumeSize": 10
                            }
                        }
                    ],
                    "IamInstanceProfile": {
                        "Ref": "instanceProfileEnvironmentManager"
                    },
                    "ImageId": "ami-01ccc867",
                    "InstanceMonitoring": false,
                    "InstanceType": "t2.medium",
                    "KeyName": {
                        "Ref": "pEc2KeyPair"
                    },
                    "SecurityGroups": {
                        "Fn::Split": [",", { "Fn::Join": [",", [{ "Ref": "sgInfraEnvironmentManager" }, { "Fn::Join": [",", { "Ref": "pEnvironmentManagerSecurityGroups" }] }]] }]
                    },
                    "UserData": {
                        "Fn::Base64": "#!/bin/bash \n echo 'HELLO WORLD' > /var/log/userdata.stdout.txt"
                    }
                }
            },
            "asgEnvironmentManager": {
                "Type": "AWS::AutoScaling::AutoScalingGroup",
                "Properties": {
                    "Cooldown": "30",
                    "DesiredCapacity": "2",
                    "HealthCheckGracePeriod": 30,
                    "HealthCheckType": "EC2",
                    "LaunchConfigurationName": {
                        "Ref": "launchConfigEnvironmentManager"
                    },
                    "LoadBalancerNames": [
                        {
                            "Ref": "loadBalancerEnvironmentManager"
                        }
                    ],
                    "MaxSize": "4",
                    "MinSize": "0",
                    "Tags": [
                        {
                            "Key": "Role",
                            "Value": "EnvironmentManager",
                            "PropagateAtLaunch": true
                        }
                    ],
                    "VPCZoneIdentifier": {
                        "Ref": "ploadBalancerEnvironmentManagerSubnetIDs"
                    }
                }
            },
            "roleInfraEnvironmentManager": {
                "Type": "AWS::IAM::Role",
                "Condition": "CreateMasterRole",
                "Properties": {
                    "AssumeRolePolicyDocument": {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {
                                    "Service": "ec2.amazonaws.com"
                                },
                                "Action": "sts:AssumeRole"
                            }
                        ]
                    },
                    "ManagedPolicyArns": [
                        "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
                    ],
                    "Policies": [
                        {
                            "PolicyName": "roleInfraEnvironmentManagerPolicy",
                            "PolicyDocument": {
                                "Version": "2012-10-17",
                                "Statement": [
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "dynamodb:Batch*",
                                            "dynamodb:DeleteItem",
                                            "dynamodb:Describe*",
                                            "dynamodb:Get*",
                                            "dynamodb:List*",
                                            "dynamodb:PutItem",
                                            "dynamodb:Query",
                                            "dynamodb:Scan",
                                            "dynamodb:UpdateItem"
                                        ],
                                        "Resource": [
                                            {
                                                "Fn::Sub": "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${pResourcePrefix}Config*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${pResourcePrefix}Infra*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${pResourcePrefix}Environment*"
                                            }
                                        ]
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": "s3:GetObject",
                                        "Resource": [
                                            {
                                                "Fn::Sub": "arn:aws:s3:::${pConfigurationBucket}/*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:s3:::${pSecretsBucket}/*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:s3:::${pBackupsBucket}/*"
                                            }
                                        ]
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "s3:GetObject",
                                            "s3:PutObject"
                                        ],
                                        "Resource": [
                                            {
                                                "Fn::Sub": "arn:aws:s3:::${pDeploymentLogsBucket}/*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:s3:::${pPackagesBucket}/*"
                                            }
                                        ]
                                    },
                                    {
                                        "Action": "sts:AssumeRole",
                                        "Effect": "Allow",
                                        "Resource": [
                                            {
                                                "Fn::Sub": "arn:aws:iam::${AWS::AccountId}:role/${pResourcePrefix}roleInfraEnvironmentManagerChild"
                                            }
                                        ].concat(managedAccounts.map(accountNumber => ({ 'Fn::Sub': `arn:aws:iam::${accountNumber}:role/\${pResourcePrefix}roleInfraEnvironmentManagerChild` })))
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "ec2:Describe*",
                                            "ec2:CreateTags"
                                        ],
                                        "Resource": [
                                            "*"
                                        ]
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "autoscaling:CreateAutoScalingGroup",
                                            "autoscaling:DescribeAutoScalingGroups",
                                            "autoscaling:DescribeScheduledActions",
                                            "autoscaling:DescribeLaunchConfigurations",
                                            "autoscaling:DescribeAutoScalingGroups",
                                            "autoscaling:CreateLaunchConfiguration",
                                            "autoscaling:DeleteLaunchConfiguration",
                                            "autoscaling:UpdateAutoScalingGroup",
                                            "autoscaling:AttachInstances*",
                                            "autoscaling:PutNotificationConfiguration",
                                            "autoscaling:PutScheduledUpdateGroupAction",
                                            "autoscaling:PutLifecycleHook",
                                            "autoscaling:CreateOrUpdateTags",
                                            "autoscaling:EnterStandby",
                                            "autoscaling:ExitStandby"
                                        ],
                                        "Resource": [
                                            "*"
                                        ]
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "sns:Get*",
                                            "sns:List*"
                                        ],
                                        "Resource": [
                                            "*"
                                        ]
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "iam:PassRole",
                                            "iam:GetInstanceProfile",
                                            "iam:GetRole"
                                        ],
                                        "Resource": "*"
                                    },
                                    {
                                        "Effect": "Allow",
                                        "Action": [
                                            "sns:Subscribe",
                                            "sns:Unsubscribe",
                                            "sns:Publish"
                                        ],
                                        "Resource": [
                                            {
                                                "Fn::Sub": "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${pResourcePrefix}footplate*"
                                            },
                                            {
                                                "Fn::Sub": "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${pResourcePrefix}environment*"
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ],
                    "RoleName": { "Fn::Sub": "${pResourcePrefix}roleInfraEnvironmentManager" }
                }
            },
            "instanceProfileEnvironmentManager": {
                "Type": "AWS::IAM::InstanceProfile",
                "Properties": {
                    "Path": "/EnvironmentManager/",
                    "Roles": [
                        {
                            "Ref": "roleInfraEnvironmentManager"
                        }
                    ]
                }
            }
        },
        "Outputs": {}
    }
};
