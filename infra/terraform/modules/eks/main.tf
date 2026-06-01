resource "aws_iam_role" "cluster" {
    name = "${var.cluster_name}-cluster-role"
    assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}
resource "aws_iam_role_policy_attachment" "cluster_policy" {
    role = aws_iam_role.cluster.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"  
}
resource "aws_eks_cluster" "main" {
    name = var.cluster_name
    version = var.cluster_version
    role_arn = aws_iam_role.cluster.arn
    vpc_config {
      subnet_ids =  concat(var.private_subnet_ids, var.public_subnet_ids)
    }
    depends_on = [ aws_iam_role_policy_attachment.cluster_policy ]
}

resource "aws_iam_role" "node_group" {
    name = "${var.cluster_name}-node-role"
    assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
    }]
    })
}
resource "aws_iam_role_policy_attachment" "node_policy" {
    role = aws_iam_role.node_group.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
} 
resource "aws_iam_role_policy_attachment" "cni_policy" {
    role = aws_iam_role.node_group.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy" 
}
resource "aws_iam_role_policy_attachment" "ecr_policy" {
    role = aws_iam_role.node_group.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}


resource "aws_eks_node_group" "main" {
    cluster_name = aws_eks_cluster.main.name
    node_group_name = "${var.cluster_name}-node-group"
    node_role_arn = aws_iam_role.node_group.arn
    subnet_ids = var.private_subnet_ids
    instance_types = [var.node_instance_type]
    scaling_config {
        desired_size = var.node_desired_size
        min_size     = var.node_min_size
        max_size     = var.node_max_size
  }
   depends_on = [
    aws_iam_role_policy_attachment.node_policy,
    aws_iam_role_policy_attachment.cni_policy,
    aws_iam_role_policy_attachment.ecr_policy,
  ]
}