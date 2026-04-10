app_name = "nexo_restaurant"
app_title = "Nexo Restaurant"
app_publisher = "AliHamza-vogue"
app_description = "Custom POS UI and Restaurant Logic for NEXO"
app_email = "your-email@example.com"
app_license = "mit"

# Point to your CSS and JS
app_include_js = "/assets/nexo_restaurant/js/nexo_pos.js"
app_include_css = "/assets/nexo_restaurant/css/nexo_pos.css"

# Ensure your Custom Fields and DocTypes are loaded
fixtures = [
    {"dt": "Custom Field", "filters": [["module", "=", "Nexo Restaurant"]]},
    {"dt": "Property Setter", "filters": [["module", "=", "Nexo Restaurant"]]}
]
