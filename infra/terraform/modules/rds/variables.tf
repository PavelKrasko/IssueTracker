variable "db_identifier" {
  type    = string
}
variable "subnet_ids" {
  type    = list(string)
}
variable "db_name" {
    type = string 
}
variable "db_username" {
    type = string
    sensitive = true  
}
variable "db_password" {
    type = string
    sensitive = true
}
variable "db_engine_version" {
    type = string
    default = "15.0"
}
variable "db_instance_class" {
    type = string
    default = "db.t3.micro"
}
variable "allocated_storage" {
    type = number
    default = 20 
}
variable "security_group_id" {
    type = string
}
variable "multi_az" {
    type = bool
    default = false
}
variable "skip_final_snapshot" {
    type = bool
    default = false
}