"""Offline recommendation loading and ranking.

Importing this package does not load a model. The HTTP service imports it while
handling an authenticated inference request, and while /health/ready checks an
enabled inference configuration.
"""
