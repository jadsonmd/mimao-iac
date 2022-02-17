# mimao-iac
Kubernets with pulumi 

### init a stack
$ pulumi stack init mimao-stack

### configure a stack
$ pulumi config set aws:region us-east-1
$ pulumi config set isMinikube false
$ pulumi config set MONGODB_URL urlMongoSrv

### show a config
$ pulumi config

### start a stack
$ pulumi up