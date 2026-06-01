variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}
variable "subnet_cidr_public_a" {
  type    = string
  default = "10.0.1.0/24"
}
variable "az_public_a" {
  type    = string
  default = "eu-central-1a"
}
variable "subnet_cidr_public_b" {
  type    = string
  default = "10.0.2.0/24"
}
variable "az_public_b" {
  type    = string
  default = "eu-central-1b"
}
variable "subnet_cidr_private_a" {
  type    = string
  default = "10.0.11.0/24"
}
variable "az_private_a" {
  type    = string
  default = "eu-central-1a"
}
variable "subnet_cidr_private_b" {
  type    = string
  default = "10.0.12.0/24"
}
variable "az_private_b" {
  type    = string
  default = "eu-central-1b"
}
variable "rds_sg_name" {
  type    = string
  default = "rds-sg"
}
variable "rds_port" {
  type    = number
  default = 1433
}