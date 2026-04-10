$(document).on('app_ready', function() {
    // Check if the current POS Profile has the restaurant checkbox enabled
    if (frappe.boot.pos_profile.is_restaurant_profile) {
        
        // 1. Branding: Swap Logo and Text
        $('.navbar-brand img').attr('src', '/assets/nexo_restaurant/images/nexo_logo.png');
        $('.navbar-brand-text').text('NEXO POS');

        // 2. Layout: Rearrange Menu (Item Groups) to be below Search
        // We use a timeout to ensure the DOM is fully rendered by POS Awesome
        setTimeout(() => {
            $('.item-group-container').insertAfter('.search-item-container');
            $('.item-group-container').addClass('nexo-horizontal-menu');
        }, 500);
        
        // 3. Add-on Logic Hook: Intercept the "Add to Cart" click
        const original_add_to_cart = frappe.ui.posapp.cart.add_item;
        
        frappe.ui.posapp.cart.add_item = function(item) {
            frappe.call({
                method: "frappe.client.get",
                args: { 
                    doctype: "Item", 
                    name: item.item_code 
                },
                callback: function(r) {
                    // Check if the item has add-ons configured in the NEXO Child Table
                    if (r.message.nexo_add_ons && r.message.nexo_add_ons.length > 0) {
                        show_addon_modal(item, r.message.nexo_add_ons, original_add_to_cart);
                    } else {
                        // If no add-ons, proceed with standard addition
                        original_add_to_cart(item);
                    }
                }
            });
        };
    }
});

function show_addon_modal(item, addons, callback) {
    let selected_addons = [];

    // Generate HTML for the add-on rows
    let addon_html = addons.map(a => `
        <div class="nexo-addon-row" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f1f1;">
            <div style="font-weight: 500;">
                ${a.item_name} <br>
                <small class="text-muted">Rs. ${frappe.format(a.price, {fieldtype: 'Currency'})}</small>
            </div>
            <button class="btn btn-sm btn-default btn-add-nexo" 
                onclick="this.classList.toggle('btn-primary'); toggleNexoAddon('${a.item_name}', ${a.price}, this)">
                Add
            </button>
        </div>
    `).join('');

    // Internal helper to track selections within the dialog
    window.toggleNexoAddon = function(name, price, btn) {
        const index = selected_addons.findIndex(x => x.name === name);
        if (index > -1) {
            selected_addons.splice(index, 1);
            btn.innerText = "Add";
        } else {
            selected_addons.push({name: name, price: price});
            btn.innerText = "Selected";
        }
    };

    const d = new frappe.ui.Dialog({
        title: `Customize ${item.item_name}`,
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'addons_list',
                options: `<div style="max-height: 400px; overflow-y: auto;">${addon_html}</div>`
            }
        ],
        primary_action_label: 'Add to Order',
        primary_action() {
            // Append selected add-ons to the item description
            if (selected_addons.length > 0) {
                let addon_text = "\nAdd-ons: " + selected_addons.map(x => `${x.name} (Rs. ${x.price})`).join(", ");
                item.description = (item.description || "") + addon_text;
                
                // Note: To actually increase the price in the cart, 
                // you would update item.rate here, but appending to description 
                // is the standard way to inform the kitchen.
            }
            
            callback(item);
            d.hide();
        }
    });

    d.show();
}
