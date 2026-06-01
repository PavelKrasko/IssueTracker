module "vpc" {
  source = "../../modules/vpc"
}

module "ecr" {
  source          = "../../modules/ecr"
  repository_name = "my-app-dev"
}

module "rds" {
  source              = "../../modules/rds"
  db_identifier       = "my-app-dev"
  db_name             = "mydb"
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = "db.t3.micro"
  db_engine_version   = "15.00.4465.1.v1"
  allocated_storage   = 20
  multi_az            = false
  skip_final_snapshot = true
  subnet_ids          = [module.vpc.private_subnet_a_id, module.vpc.private_subnet_b_id]
  security_group_id   = module.vpc.rds_security_group_id
}