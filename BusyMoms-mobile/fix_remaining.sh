#!/bin/bash

# Fix icon imports that don't exist in lucide-react-native
find src -name "*.tsx" -type f -exec sed -i 's/CheckSquare/Check/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/Edit2/Edit/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/Trash2/Trash/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/RefreshCw/RefreshCcw/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/AlertCircle/AlertTriangle/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/CheckCircle/Check/g' {} \;

# Fix Header props in app folder
find app -name "*.tsx" -type f -exec sed -i 's/showBackButton/onBack={() => router.back()}/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/rightElement=/rightAction=/g' {} \;

echo "Remaining fixes applied"
