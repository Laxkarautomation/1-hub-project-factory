# 1 Hub Project Factory Architecture

## Factory Layers

1. Base ECC Layer
- agents
- skills
- commands
- hooks
- contexts
- integrations

2. Factory Control Layer
- rules
- architecture
- project templates
- project memory
- export system

3. Active Projects Layer
- active-projects/
- each project stays isolated
- each project can become its own repo

4. Exports Layer
- exports/
- release ZIPs
- deployment-ready packages

## Standard Workflow

Idea
→ Project Brief
→ Architecture Lock
→ Scaffold
→ Core Engine
→ Testing
→ Documentation
→ Export
→ Deploy
→ Remove from active workspace if needed

## Future Vision

This factory can later become a 24/7 deployed AI development dashboard.
For now, it runs inside GitHub Codespaces.
