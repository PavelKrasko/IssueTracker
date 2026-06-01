output "vpc_id" {
  value = aws_vpc.main.id
}
output "public_subnet_a_id" {
  value = aws_subnet.public_a.id
}
output "public_subnet_b_id" {
  value = aws_subnet.public_b.id
}
output "private_subnet_a_id" {
  value = aws_subnet.private_a.id
}
output "private_subnet_b_id" {
  value = aws_subnet.private_b.id
}
output "internet_gateway_id" {
  value = aws_internet_gateway.main.id
}
output "nat_gateway_id" {
  value = aws_nat_gateway.main.id
}
output "nat_eip" {
  value = aws_eip.nat.public_ip
}
output "rds_security_group_id" {
  value = aws_security_group.rds.id
}