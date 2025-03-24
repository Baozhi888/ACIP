@echo off
REM Create core directories
mkdir core\src
mkdir core\tests
echo. > core\README.md

REM Create modules directories and files
mkdir modules\context_management\src
mkdir modules\context_management\tests
echo. > modules\context_management\README.md

mkdir modules\data_access\src
mkdir modules\data_access\tests
echo. > modules\data_access\README.md

mkdir modules\security_authentication\src
mkdir modules\security_authentication\tests
echo. > modules\security_authentication\README.md

mkdir modules\model_invocation\src
mkdir modules\model_invocation\tests
echo. > modules\model_invocation\README.md

mkdir modules\payment_settlement\src
mkdir modules\payment_settlement\tests
echo. > modules\payment_settlement\README.md

REM Create integrations directories
mkdir integrations\rest_api
mkdir integrations\graphql

REM Create docs directory and files
mkdir docs
echo. > docs\installation.md
echo. > docs\usage.md
echo. > docs\architecture.md

REM Create examples directory and files
mkdir examples
echo. > examples\smart_assistant.py
echo. > examples\automated_robot.js

REM Create tests and scripts directories
mkdir tests
mkdir scripts

REM Create root files
echo. > CONTRIBUTING.md
echo. > GOVERNANCE.md
echo. > LICENSE
echo. > README.md

echo Directory structure created successfully! 