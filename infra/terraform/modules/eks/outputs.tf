output "cluster_id" {
  value = aws_eks_cluster.main.id
}
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}
output "cluster_name" {
  value = aws_eks_cluster.main.name
}
output "node_group_arn" {
  value = aws_eks_node_group.main.arn
}