#!/bin/bash
# Автоматическое подключение к Supabase проекту
PROJECT_REF="mgslapkswztsonyooogm"
echo "Linking to project: $PROJECT_REF"
echo ""
echo "Please enter your database password from:"
echo "Supabase Dashboard -> Settings -> Database"
echo ""
npx supabase link --project-ref "$PROJECT_REF"
