# mimao-iac
Kubernets with pulumi 

### init a stack
```bash
$ pulumi stack init mimao-stack
```
### configure a stack
```bash
$ pulumi config set aws:region us-east-1
$ pulumi config set isMinikube false
$ pulumi config set MONGODB_URL urlMongoSrv
```

### show a config
```bash
$ pulumi config
```

### start a stack
```bash
$ pulumi up
```