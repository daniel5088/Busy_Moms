#!/bin/bash
# Batch fix common import and API issues

# Fix useTheme imports
find src -name "*.tsx" -type f -exec sed -i "s/from '..\/..\/contexts\/ThemeContext'/from '..\/..\/hooks\/useTheme'/g" {} \;
find src -name "*.tsx" -type f -exec sed -i "s/from '..\/contexts\/ThemeContext'/from '..\/hooks\/useTheme'/g" {} \;

# Fix Modal prop
find src -name "*.tsx" -type f -exec sed -i 's/isVisible=/visible=/g' {} \;

# Fix Button prop
find src -name "*.tsx" -type f -exec sed -i 's/label=/title=/g' {} \;

# Fix Select prop
find src -name "*.tsx" -type f -exec sed -i 's/onValueChange=/onChange=/g' {} \;

echo "Batch fixes applied"
