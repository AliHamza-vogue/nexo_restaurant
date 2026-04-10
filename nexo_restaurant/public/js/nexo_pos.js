/**
 * NEXO Restaurant POS Customization logic
 * Optimized for Frappe v15 / POS Awesome
 */

$(document).on('app_ready', function() {
    // Only run if the user is actually visiting the POS page
    if (frappe.get_route()[0] === 'posapp') {
        init_nexo_restaurant_observer();
    }
});

/**
 * Wait for POS Awesome instance to be ready before applying UI/Logic changes
 */
function init_nexo_restaurant_observer() {
    let attempts = 0;
    const max_attempts = 20;

    const check_interval = setInterval(() => {
        attempts++;
        
        // Target the POS Awesome instance and its loaded profile
        if (frappe.ui.posapp && frappe.ui.posapp.instance && frappe.ui.posapp.instance.pos_profile) {
            clearInterval(check_interval);
            
            const profile = frappe.ui.posapp.instance.pos_profile;
            
            // Only apply customizations if "Is Restaurant Profile" is checked
            if (profile.is_restaurant_profile) {
                apply_nexo_restaurant_ui();
                hook_nexo_pos_cart();
            }
        }

        if (attempts >= max_attempts) {
            clearInterval(check_interval);
            console.log("NEXO POS: Profile loading timed out or not a Restaurant Profile.");
        }
    }, 500);
}

/**
 * Handles all UI transformations (Branding, Layout, Menus)
 */
function apply_nexo_restaurant_ui() {
    console.log("NEXO: Applying Restaurant UI...");

    // 1. Branding: Swap Logo (Image must be in /public/images/nexo_logo.png)
    $('.navbar-brand img').attr('src', '/assets/nexo_restaurant/images/nexo_logo.png');
    $('.navbar-brand-text').text('NEXO POS');

    // 2. Layout: Move Item Groups below search and make them horizontal
    // Using a minor delay to ensure Vue has finished rendering the selector
    setTimeout(() => {
        const item_group_area = $('.item-group-container');
        const search_area = $('.search-item-container');

        if (item_group_area.length && search_area.length) {
            item_group_area.insertAfter(search_area);
            item_group_area.addClass('nexo-horizontal-menu'); // Targeted by your CSS
        }
    }, 800);
}

/**
 * Intercepts the add_item function to inject the Add-on Dialog
 */
function hook_nexo_pos_cart() {
    const cart = frappe.ui.posapp.instance.cart;
    const original_add_item = cart.add_item.bind(cart);

    cart.add_item = function(item) {
        // Fetch the full Item document to check for custom NEXO add-ons
        frappe.call({
            method: "frappe.client.get",
            args: { 
                doctype: "Item", 
                name: item.item_code 
            },
            callback: function(r) {
                const item_doc = r.message;
                
                if (item_doc && item_doc.nexo_add_ons && item_doc.nexo_add_ons.length > 0) {
                    show_nexo_addon_modal(item, item_doc.nexo_add_ons, original_add_item);
                } else {
                    original_add_item(item);
                }
            }
        });
    };
}

/**
 * Renders the Add-on Dialog
 */
function show_nexo_addon_modal(item, addons, callback) {
    let selected_addons = [];

    let addon_html = addons.map(a => `
        <div class="nexo-addon-row" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #f1f1f1;">
            <div>
                <span style="font-weight: 600; font-size: 1.1em;">${a.item_name}</span><br>
                <span class="text-primary">+ ${frappe.format(a.price, {fieldtype: 'Currency'})}</span>
            </div>
            <button class="btn btn-sm btn-default nexo-addon-btn" 
                style="min-width: 80px; border-radius: 20px;"
                onclick="toggleNexoAddonSelection('${a.item_name}', ${a.price}, this)">
                Add
            </button>
        </div>
    `).join('');

    // Global helper for the button clicks inside the HTML string
    window.toggleNexoAddonSelection = function(name, price, btn) {
        const index = selected_addons.findIndex(x => x.name === name);
        if (index > -1) {
            selected_addons.splice(index, 1);
            $(btn).text("Add").removeClass("btn-primary").addClass("btn-default");
        } else {
            selected_addons.push({ name: name, price: price });
            $(btn).text("Selected").removeClass("btn-default").addClass("btn-primary");
        }
    };

    const d = new frappe.ui.Dialog({
        title: `Options for ${item.item_name}`,
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'list',
                options: `<div style="max-height: 450px; overflow-y: auto;">${addon_html}</div>`
            }
        ],
        primary_action_label: 'Update Order',
        primary_action() {
            if (selected_addons.length > 0) {
                // Update description for the receipt/kitchen
                const names = selected_addons.map(x => x.name).join(", ");
                item.description = (item.description || "") + "\n[Add-ons: " + names + "]";
                
                // Increase the price of the item by the total of selected add-ons
                const total_addon_price = selected_addons.reduce((sum, x) => sum + x.price, 0);
                item.rate = parseFloat(item.rate) + total_addon_price;
            }
            
            callback(item);
            d.hide();
        }
    });

    d.show();
}
