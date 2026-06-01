resource "aws_db_subnet_group" "main" {
    name = "${var.db_identifier}-subnet-group" 
    subnet_ids = var.subnet_ids
}
resource "aws_db_instance" "main" {
    identifier = var.db_identifier
    db_name = var.db_name
    username = var.db_username
    password = var.db_password

    engine = "sqlserver-se"
    engine_version = var.db_engine_version
    instance_class = var.db_instance_class
    allocated_storage = var.allocated_storage
    storage_type = "gp2"

    db_subnet_group_name = aws_db_subnet_group.main.name
    vpc_security_group_ids = [var.security_group_id]

    multi_az = var.multi_az
    skip_final_snapshot = var.skip_final_snapshot
    deletion_protection = false
}