locals {
  apiName = format("%s-%s", "fincop-api", var.env)
  preUrlName  = (var.env == "prd" ? "api" : "${var.env}.api")
  callbackUrl = "https://${local.preUrlName}.${var.domain}/callback"
  cognitoName = format("%s-%s", var.project_name, var.env)
}

data "aws_caller_identity" "current" {}

module "apigateway" {
  source   = "github.com/Wizzi-Modules/apigateway"
  region   = var.region
  tags     = var.tags
  api_name = local.apiName
}

module "cognitoWizzi" {
  source = "github.com/Wizzi-Modules/cognito-email-name-surname"

  name        = local.cognitoName
  callbackUrl = local.callbackUrl

  lambda_mailer            = module.mailer.lambda_mailer.function_name
#   lambda_post_confirmation = module.lambdaPostConfirmation.aws_lambda_function.function.function_name

  depends_on = [module.mailer]
}

module "cognitoWizziRoutes" {
  source = "github.com/Wizzi-Modules/cognito-basic-routes"

  region = var.region
  env    = var.env
  aws_id = data.aws_caller_identity.current.account_id
  tags   = var.tags

  name_prefix = "wizzi-auth"

  cognito_client_id = module.cognitoWizzi.aws_cognito_user_pool_client.this.id
  cognito_pool_id   = module.cognitoWizzi.aws_cognito_user_pool.this.id

  apigateway_id                = module.apigateway.aws_api_gateway_rest_api.rest_api.id
  apigateway_execution_arn     = module.apigateway.aws_api_gateway_rest_api.rest_api.execution_arn
  apigateway_validator_body_id = module.apigateway.aws_api_gateway_validator.body.id
  parent_resource              = module.apigateway.aws_api_gateway_rest_api.rest_api.root_resource_id
}

module "mailer" {
  source = "github.com/Wizzi-Modules/cognito-wizzi-mailer"

  region = var.region
  env    = var.env
  aws_id = data.aws_caller_identity.current.account_id
  tags   = var.tags

  name_prefix = "fincop-auth"

  front_url = var.front_url
}

# TODO: Uncomment and configure the lambdaPostConfirmation module when ready
# module "lambdaPostConfirmation" {
#   source = "github.com/Wizzi-Modules/lambda-go"

#   region = var.region
#   tags   = var.tags
#   env    = var.env
#   aws_id = data.aws_caller_identity.current.account_id

#   subnets         = module.network_vpc_subnet_sg.private_subnet_ids
#   security_groups = [module.network_vpc_subnet_sg.aws_security_group.wizzi_lambda.id]

#   name_prefix = "fincop-auth"
#   variables = {
#     ENV          = var.env
#     DB_HOST      = local.DB_HOST
#     DB_NAME      = local.DB_NAME
#     DB_SECRET_ID = local.DB_SECRET_ID
#   }

#   extra_params = local.lamda_extra_params

#   key    = "post_confirmation"
#   folder = "../auth/post_confirmation"
# }
