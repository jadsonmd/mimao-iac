import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as awsx from "@pulumi/awsx";
import * as k8s from "@pulumi/kubernetes";
import * as nginx from "@pulumi/kubernetes-ingress-nginx";

const name = "mimaoapp";

const config = new pulumi.Config();
const isMinikube = config.requireBoolean("isMinikube");
const mongoURL = config.requireSecret("MONGODB_URL")

const vpc = new awsx.ec2.Vpc(`${name}-vpc`, { numberOfAvailabilityZones: 2, tags: { Name: `${name}-vpc-tags` } });
export const vpcId = vpc.id;

const cluster = new eks.Cluster("mimao-cluster", {
    vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    tags: { Name: "mimao-cluster-tags" },
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 3,
    storageClasses: "gp2",
    instanceType: "t3a.medium",
});

export const clusterName = cluster.core.tags;
export const clusterEndpoint = cluster.core.endpoint;
export const kubeConfig = cluster.core.kubeconfig;

const ctrl = new nginx.IngressController('ingress-controller', {
    controller: {
        publishService: {
            enabled: true,
        },
    },
}, { provider: cluster.provider });

const appLabelsBack = { appClass: `${name}-back-labels` };
const deploymentBack = new k8s.apps.v1.Deployment(`${name}-back-deployment`, {
    metadata: {
        labels: appLabelsBack,
    },
    spec: {
        selector: { matchLabels: appLabelsBack },
        replicas: 1,
        template: {
            metadata: {
                labels: appLabelsBack,
            },
            spec: {
                containers: [
                    {
                        name: `${name}-back`,
                        image: "jadsonmd/mimao",
                        env: [{ name: "MONGODB_URL", value: mongoURL }],
                        ports: [{ containerPort: 8080 }]
                    },
                ]
            }
        }
    }
}, { provider: cluster.provider });

const appLabelsFront = { appClass: `${name}-front-labels` };
const deploymentFront = new k8s.apps.v1.Deployment(`${name}-front-deployment`, {
    metadata: {
        labels: appLabelsFront,
    },
    spec: {
        selector: { matchLabels: appLabelsFront },
        replicas: 1,
        template: {
            metadata: {
                labels: appLabelsFront,
            },
            spec: {
                containers: [
                    {
                        name: `${name}-front`,
                        image: "jadsonmd/mimao-view:latest",
                        ports: [{ containerPort: 3000 }]
                    },
                ]
            }
        }
    }
}, { provider: cluster.provider });

const serviceBack = new k8s.core.v1.Service(`${name}-service-back`, {
    metadata: {
        labels: appLabelsBack,
        name: `${name}-service-back`,
    },
    spec: {
        type: "ClusterIP",
        ports: [{ port: 8080, targetPort: 8080 }],
        selector: appLabelsBack,
    }
}, { provider: cluster.provider });

const serviceFront = new k8s.core.v1.Service(`${name}-service-front`, {
    metadata: {
        labels: appLabelsFront,
        name: `${name}-service-front`,
    },
    spec: {
        type: "ClusterIP",
        ports: [{ port: 3000, targetPort: 3000 }],
        selector: appLabelsFront,
    }
}, { provider: cluster.provider });

const ingress = new k8s.networking.v1.Ingress(`${name}-ingress`, {
    metadata: {
        name: `nginx-k8s-ingress`,
        annotations: {
            "kubernetes.io/ingress.class": "nginx",
            "nginx.ingress.kubernetes.io/rewrite-target": "/$1",
        },
    },
    spec: {
        rules: [{
            http: {
                paths: [{
                    path: "/api[/|$](.*)",
                    pathType: "Prefix",
                    backend: {
                        service: {
                            name: `${name}-service-back`,
                            port: {
                                number: 8080,
                            },
                        },
                    },
                },
                {
                    path: "/(.*)",
                    pathType: "Prefix",
                    backend: {
                        service: {
                            name: `${name}-service-front`,
                            port: {
                                number: 3000,
                            },
                        },
                    },
                }],
            },
        }],
    },
}, { provider: cluster.provider });

// export const ingr = ingress.status;
// export const controllerStatus = ctrl.status;
// export const urn = ctrl.urn;
export const serviceHostName = ingress.status.loadBalancer.ingress[0].hostname;
// export const serviceIp = ingress.status.loadBalancer.ingress[0].ip;
// export const serviceFrontHostName = serviceFront.status.loadBalancer.ingress[0].hostname;
// export const serviceBackHostName = serviceBack.status.loadBalancer.ingress[0].hostname;

// export const ip = isMinikube
//     ? serviceFront.spec.clusterIP
//     : serviceFront.status.loadBalancer.apply(
//         (lb) => lb.ingress[0].ip || lb.ingress[0].hostname
//     );

// export const ip = isMinikube
//     ? serviceNginx.spec.clusterIP
//     : serviceNginx.status.loadBalancer.apply(
//         (lb) => lb.ingress[0].ip || lb.ingress[0].hostname
//     );