#update

usage: `claudia update {OPTIONS}`

Deploy a new version of the Lambda function using project files, update any associated web APIs

## _OPTIONS_ are:

*  `--version` _[OPTIONAL]_ A version alias to automatically assign to the new deployment
  _For example_: development
*  `--source` _[OPTIONAL]_ Directory with project files
  _Defaults to_: current directory
*  `--config` _[OPTIONAL]_ Config file containing the resource names
  _Defaults to_: claudia.json