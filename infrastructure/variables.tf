variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "front_url" {
  description = "The front-end URL for the application"
  type        = string
}

variable "env" {
  description = "The environment to deploy to"
  type        = string
}

variable "region" {
  description = "The AWS region to deploy to"
  type        = string
}

variable "domain" {
  description = "The domain for the application"
  type        = string
}

variable "tags" {
  description = "Tags to apply to AWS resources"
  type        = map(string)
}