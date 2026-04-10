
$(document).on('app_ready', function() {
    if (frappe.boot.pos_profile.is_restaurant_profile) {
        // 1. Rearrange Menu below Search
        $('.item-group-container').insertAfter('.search-item-container');
        
        // 2. Add-on Logic Hook
        const original_add_to_cart = frappe.ui.posapp.cart.add_item;
        frappe.ui.posapp.cart.add_item = function(item) {
            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Item", name: item.item_code },
                callback: function(r) {
                    if (r.message.nexo_add_ons && r.message.nexo_add_ons.length > 0) {
                        show_addon_modal(item, r.message.nexo_add_ons);
                    } else {
                        original_add_to_cart(item);
                    }
                }
            });
        };
    }
});

function show_addon_modal(item, addons) {
    // Code to render a Vue-style pop-up here
    console.log("Showing Add-ons for:", item.item_code);
}
