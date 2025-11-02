#!/bin/bash

# Test curl commands for /api/test-analyser endpoint
# Execute these commands while the dev server is running (npm run dev)

BASE_URL="http://localhost:3000"
ENDPOINT="/api/test-analyser"

# Colour output for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

echo -e "${BLUE}=== Sigil Analyser API Test Commands ===${NC}\n"

# 1. Simple CSV - Employee data
echo -e "${GREEN}1. Simple CSV (Employee Data)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "id,name,email,age,department,salary,active,joinDate\n1,Alice Johnson,alice@example.com,32,Engineering,85000,true,2020-03-15\n2,Bob Smith,bob@example.com,28,Marketing,65000,true,2021-06-22\n3,Carol White,carol@example.com,45,HR,75000,false,2018-01-10"
  }'
echo -e "\n\n"

# 2. JSON Array - Products
echo -e "${GREEN}2. JSON Array (Product Catalogue)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "[{\"id\":1,\"name\":\"Laptop\",\"price\":999.99,\"category\":\"Electronics\",\"inStock\":true},{\"id\":2,\"name\":\"Desk Chair\",\"price\":299.50,\"category\":\"Furniture\",\"inStock\":false},{\"id\":3,\"name\":\"Coffee Mug\",\"price\":12.99,\"category\":\"Kitchen\",\"inStock\":true}]"
  }'
echo -e "\n\n"

# 3. Nested JSON - User profiles
echo -e "${GREEN}3. Nested JSON (User Profiles)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "{\"users\":[{\"id\":1,\"profile\":{\"name\":\"Alice\",\"age\":30,\"contact\":{\"email\":\"alice@test.com\",\"phone\":\"+44-123-456\"}},\"preferences\":{\"theme\":\"dark\",\"notifications\":true}},{\"id\":2,\"profile\":{\"name\":\"Bob\",\"age\":25,\"contact\":{\"email\":\"bob@test.com\",\"phone\":\"+44-789-012\"}},\"preferences\":{\"theme\":\"light\",\"notifications\":false}}]}"
  }'
echo -e "\n\n"

# 4. XML - Book catalogue
echo -e "${GREEN}4. XML (Book Catalogue)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<catalogue>\n  <book id=\"1\">\n    <title>The Great Gatsby</title>\n    <author>F. Scott Fitzgerald</author>\n    <year>1925</year>\n    <price currency=\"GBP\">12.99</price>\n  </book>\n  <book id=\"2\">\n    <title>1984</title>\n    <author>George Orwell</author>\n    <year>1949</year>\n    <price currency=\"GBP\">10.99</price>\n  </book>\n</catalogue>"
  }'
echo -e "\n\n"

# 5. YAML - Configuration
echo -e "${GREEN}5. YAML (Server Configuration)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "server:\n  host: localhost\n  port: 8080\n  ssl:\n    enabled: true\n    certificate: /path/to/cert.pem\ndatabase:\n  type: postgresql\n  connection:\n    host: db.example.com\n    port: 5432\n    database: myapp\n  pool:\n    min: 2\n    max: 10\nlogging:\n  level: info\n  format: json"
  }'
echo -e "\n\n"

# 6. GeoJSON - Location data
echo -e "${GREEN}6. GeoJSON (Points of Interest)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-0.1276,51.5074]},\"properties\":{\"name\":\"London\",\"population\":8982000,\"type\":\"city\"}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-3.1883,55.9533]},\"properties\":{\"name\":\"Edinburgh\",\"population\":524930,\"type\":\"city\"}}]}"
  }'
echo -e "\n\n"

# 7. TSV - Tab-separated values
echo -e "${GREEN}7. TSV (Survey Responses)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "respondent_id\tage\tsatisfaction\tcomment\n1001\t34\t5\tExcellent service\n1002\t28\t4\tVery good\n1003\t52\t3\tAverage experience"
  }'
echo -e "\n\n"

# 8. Large CSV - Performance test
echo -e "${GREEN}8. Large CSV (100 rows - Performance Test)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "rawData": "id,product,category,price,quantity,date\n1,Widget A,Electronics,29.99,150,2024-01-15\n2,Gadget B,Electronics,49.99,75,2024-01-16\n3,Tool C,Hardware,19.99,200,2024-01-17\n4,Device D,Electronics,99.99,50,2024-01-18\n5,Item E,Office,14.99,300,2024-01-19\n6,Product F,Electronics,34.99,100,2024-01-20\n7,Thing G,Hardware,24.99,125,2024-01-21\n8,Object H,Office,9.99,400,2024-01-22\n9,Widget I,Electronics,44.99,80,2024-01-23\n10,Gadget J,Electronics,54.99,60,2024-01-24"
}
EOF
echo -e "\n\n"

# 9. Edge Case - Empty data (should fail)
echo -e "${GREEN}9. Edge Case - Empty rawData (Expected: 400 Error)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": ""
  }'
echo -e "\n\n"

# 10. Edge Case - Whitespace only (should fail)
echo -e "${GREEN}10. Edge Case - Whitespace Only (Expected: 400 Error)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "   \n   \t   "
  }'
echo -e "\n\n"

# 11. Edge Case - Missing rawData field (should fail)
echo -e "${GREEN}11. Edge Case - Missing rawData Field (Expected: 400 Error)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "some,csv,data"
  }'
echo -e "\n\n"

# 12. Edge Case - Invalid JSON body (should fail)
echo -e "${GREEN}12. Edge Case - Malformed JSON (Expected: 400/500 Error)${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d 'not valid json'
echo -e "\n\n"

# 13. CSV with quoted fields and special characters
echo -e "${GREEN}13. CSV with Quoted Fields & Special Characters${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "name,description,price\n\"Smart Watch\",\"Features: GPS, Heart Rate, \"\"Premium\"\" Edition\",299.99\n\"Wireless Earbuds\",\"Noise cancelling, 20h battery\",149.99"
  }'
echo -e "\n\n"

# 14. Mixed data types
echo -e "${GREEN}14. JSON with Mixed Data Types${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "{\"metrics\":{\"count\":42,\"revenue\":15234.50,\"active\":true,\"lastUpdated\":\"2024-11-02T10:30:00Z\",\"tags\":[\"premium\",\"verified\"],\"metadata\":null}}"
  }'
echo -e "\n\n"

# 15. Single row CSV
echo -e "${GREEN}15. Single Row CSV${NC}"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "rawData": "name,value,timestamp\nTest Entry,123,2024-11-02T10:00:00Z"
  }'
echo -e "\n\n"

echo -e "${BLUE}=== Test Commands Complete ===${NC}"
echo -e "Tip: Pipe output through ${GREEN}jq${NC} for formatted JSON:"
echo -e "  curl ... | jq '.'"
