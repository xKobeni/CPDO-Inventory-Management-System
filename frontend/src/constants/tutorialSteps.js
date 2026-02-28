// Tutorial steps configuration for all pages
// Each page has an array of steps with target selectors, titles, and descriptions

export const dashboardTutorialSteps = [
  {
    target: "[data-tutorial='dashboard-header']",
    title: "Welcome to Dashboard",
    description: "This is your main dashboard where you can see an overview of your entire inventory system. Let's walk through the key sections!",
  },
  {
    target: "[data-tutorial='view-inventory-btn']",
    title: "View Inventory Button",
    description: "Click this button to navigate to the full inventory list where you can see all your items, supplies, and assets.",
  },
  {
    target: "[data-tutorial='reports-btn']",
    title: "Reports Button",
    description: "Access detailed reports and analytics about your inventory, transactions, and stock movements.",
  },
  {
    target: "[data-tutorial='kpi-cards']",
    title: "Key Performance Indicators",
    description: "These cards show important metrics at a glance: total items, supplies count, assets, and stock alerts. They update in real-time.",
  },
  {
    target: "[data-tutorial='total-items-card']",
    title: "Total Items",
    description: "Shows the total count of active supplies and assets in your inventory system.",
  },
  {
    target: "[data-tutorial='supplies-card']",
    title: "Supplies Count",
    description: "Displays the number of consumable items (supplies) that can be used and restocked.",
  },
  {
    target: "[data-tutorial='assets-card']",
    title: "Assets Count",
    description: "Shows total assets in the system, including how many are currently deployed to people.",
  },
  {
    target: "[data-tutorial='out-of-stock-card']",
    title: "Out of Stock Alert",
    description: "Highlighted in red when supplies have zero quantity. Click to see which items need immediate restocking.",
  },
  {
    target: "[data-tutorial='low-stock-card']",
    title: "Low Stock Warning",
    description: "Highlighted in amber when supplies are at or below their reorder level. Click to view and plan restocking.",
  },
  {
    target: "[data-tutorial='people-stats']",
    title: "People & Transactions Overview",
    description: "This section shows key statistics including total registered people, daily and monthly transaction counts, and a supply movements chart tracking stock in and stock out trends over the last 14 days.",
  },
  {
    target: "[data-tutorial='charts-section']",
    title: "Analytics Charts",
    description: "Visual charts showing transaction trends over time, inventory distribution by category, and value breakdown.",
  },
  {
    target: "[data-tutorial='recent-activity']",
    title: "Recent Activity",
    description: "A live feed of the latest transactions and audit logs, showing who did what and when. Stay informed about all inventory changes.",
  },
]

// Items Page (Inventory Categories) Tutorial Steps
export const itemsPageTutorialSteps = [
  {
    target: "[data-tutorial='items-header']",
    title: "Inventory Categories",
    description: "Welcome to the Inventory Categories page! Here you can browse all your categories and navigate to view items within each category.",
  },
  {
    target: "[data-tutorial='low-stock-btn']",
    title: "Low Stock Button",
    description: "Quickly view all items that are running low on stock across all categories. Great for planning restocking.",
  },
  {
    target: "[data-tutorial='out-of-stock-btn']",
    title: "Out of Stock Button",
    description: "See all items with zero quantity that need immediate attention and restocking.",
  },
  {
    target: "[data-tutorial='manage-categories-btn']",
    title: "Manage Categories",
    description: "Click here to manage your categories - add new ones, edit icons, or view category details in a table format.",
  },
  {
    target: "[data-tutorial='categories-search']",
    title: "Search Categories",
    description: "Use this search box to quickly find a specific category by name or slug.",
  },
  {
    target: "[data-tutorial='category-filters']",
    title: "Category Type Filters",
    description: "Filter categories by type: All, Supply (consumables), or Asset/Property (equipment and fixed assets).",
  },
  {
    target: "[data-tutorial='category-grid']",
    title: "Category Cards",
    description: "Click on any category card to view and manage all items within that category. Each card shows the category name and type.",
  },
]

// Manage Categories Page Tutorial Steps
export const manageCategoriesTutorialSteps = [
  {
    target: "[data-tutorial='manage-header']",
    title: "Manage Categories",
    description: "This page lets you manage all your inventory categories. Categories are automatically created when you add items.",
  },
  {
    target: "[data-tutorial='add-category-btn']",
    title: "Add Category",
    description: "Click to create a new category. You'll be taken to the category page to add your first item, which creates the category.",
  },
  {
    target: "[data-tutorial='refresh-categories-btn']",
    title: "Refresh Categories",
    description: "Refresh the category list to get the latest data from the server.",
  },
  {
    target: "[data-tutorial='categories-search']",
    title: "Search Categories",
    description: "Search for categories by name or slug to quickly find what you're looking for.",
  },
  {
    target: "[data-tutorial='categories-table']",
    title: "Categories Table",
    description: "View all categories with their details: name, slug, type (Supply/Asset), icon, and item count. Click a name to view items in that category.",
  },
  {
    target: "[data-tutorial='category-actions']",
    title: "Edit Category",
    description: "Click the pencil icon to edit a category's icon. Categories derive their name from items, so you manage items to rename categories.",
  },
]

// Category Items Page Tutorial Steps
export const categoryItemsTutorialSteps = [
  {
    target: "[data-tutorial='category-header']",
    title: "Category Items",
    description: "Welcome to this category! Here you can view, add, edit, and manage all items within this category.",
  },
  {
    target: "[data-tutorial='add-item-btn']",
    title: "Add New Item",
    description: "Click to add a new item to this category. Fill in the details like name, quantity, property number, and more.",
  },
  {
    target: "[data-tutorial='refresh-items-btn']",
    title: "Refresh Items",
    description: "Reload the items list to get the latest data from the server.",
  },
  {
    target: "[data-tutorial='value-card']",
    title: "Total Asset Value",
    description: "Shows the total monetary value of all items in this category, calculated from unit costs and quantities.",
  },
  {
    target: "[data-tutorial='summary-card']",
    title: "Status Summary",
    description: "Visual breakdown of item statuses: In Stock (green), Low Stock (amber), and Other statuses like Deployed or For Repair.",
  },
  {
    target: "[data-tutorial='items-search']",
    title: "Search Items",
    description: "Search items by name, property number, serial number, or division. Results update as you type.",
  },
  {
    target: "[data-tutorial='status-filter']",
    title: "Status Filter",
    description: "Filter items by their status: In Stock, Low Stock, Deployed, For Repair, Disposed, or Lost.",
  },
  {
    target: "[data-tutorial='archive-filter']",
    title: "Archive Filter",
    description: "Switch between viewing active items or archived items. Archived items are hidden from normal views but not deleted.",
  },
  {
    target: "[data-tutorial='items-table']",
    title: "Items Table",
    description: "View all items with their details. Click on a row to see full details in a side panel. Use the action menu (three dots) to edit or archive items.",
  },
  {
    target: "[data-tutorial='customize-columns-btn']",
    title: "Customize Columns",
    description: "Click to show or hide table columns based on your preference. Customize the view to show only the information you need.",
  },
  {
    target: "[data-tutorial='pagination']",
    title: "Pagination Controls",
    description: "Navigate between pages of items and change how many items to show per page (10, 25, 50, or 100).",
  },
]

// Inventory Movements Page Tutorial Steps
export const inventoryMovementsTutorialSteps = [
  {
    target: "[data-tutorial='movements-header']",
    title: "Inventory Movements",
    description: "Track all quantity changes for your supplies. This page shows a detailed history of stock in, stock out, and adjustments.",
  },
  {
    target: "[data-tutorial='refresh-movements-btn']",
    title: "Refresh Data",
    description: "Click to refresh the movements list and get the latest transaction data from the server.",
  },
  {
    target: "[data-tutorial='action-buttons']",
    title: "Quick Actions",
    description: "Use these buttons to quickly navigate to Stock In (receive supplies) or Stock Out (issue supplies) pages.",
  },
  {
    target: "[data-tutorial='summary-cards']",
    title: "Movement Summary",
    description: "View totals for your filtered period: Total In (supplies received), Total Out (supplies issued), and Net Change (overall impact).",
  },
  {
    target: "[data-tutorial='search-input']",
    title: "Search Movements",
    description: "Search across items, reference numbers, people, offices, and other details. Results update as you type.",
  },
  {
    target: "[data-tutorial='type-filter']",
    title: "Movement Type Filter",
    description: "Filter by movement type: All movements, Stock In only, Stock Out only, or Adjustments only.",
  },
  {
    target: "[data-tutorial='date-filters']",
    title: "Date Range Filters",
    description: "Set the date range to view movements within a specific period. Defaults to the last month.",
  },
  {
    target: "[data-tutorial='page-size']",
    title: "Rows Per Page",
    description: "Choose how many movement entries to display per page (10, 25, or 50).",
  },
  {
    target: "[data-tutorial='movements-table']",
    title: "Movements Table",
    description: "View detailed movement history with date, item details, type, quantity changes, running balances, remarks, and who made the transaction.",
  },
  {
    target: "[data-tutorial='pagination']",
    title: "Pagination Controls",
    description: "Navigate between pages and see how many entries are currently displayed out of the total filtered results.",
  },
]

// User Management Page Tutorial Steps
export const userManagementTutorialSteps = [
  {
    target: "[data-tutorial='users-header']",
    title: "User Management",
    description: "Welcome to User Management! This admin-only page lets you manage system users, their roles, and permissions.",
  },
  {
    target: "[data-tutorial='refresh-users-btn']",
    title: "Refresh Users",
    description: "Click to refresh the user list and get the latest data from the server.",
  },
  {
    target: "[data-tutorial='add-user-btn']",
    title: "Add New User",
    description: "Create new user accounts with email, temporary password, and role assignment. Users will need to verify their email before first login.",
  },
  {
    target: "[data-tutorial='people-management-btn']",
    title: "People Management",
    description: "Manage the people database for issuances and transactions. Add, edit, or remove people from your organization.",
  },
  {
    target: "[data-tutorial='user-stats']",
    title: "User Statistics",
    description: "Quick overview of your user base: total users, admins, staff members, and active users.",
  },
  {
    target: "[data-tutorial='users-search']",
    title: "Search Users",
    description: "Search for users by name or email address to quickly find specific accounts.",
  },
  {
    target: "[data-tutorial='role-filter']",
    title: "Filter by Role",
    description: "Filter users by their role: Admin (full access), Staff (manage inventory), or Requester (request items).",
  },
  {
    target: "[data-tutorial='status-filter']",
    title: "Filter by Status",
    description: "Filter users by their account status: Active (can log in) or Inactive (account disabled).",
  },
  {
    target: "[data-tutorial='users-table']",
    title: "Users Table",
    description: "View all user accounts with their details, roles, and status. Use the actions menu to edit, reset passwords, or manage accounts.",
  },
  {
    target: "[data-tutorial='user-actions']",
    title: "User Actions",
    description: "Click the three-dot menu for each user to edit details, reset passwords, resend verification emails, or activate/deactivate accounts.",
  },
]

// Audit Logs Page Tutorial Steps
export const auditLogsTutorialSteps = [
  {
    target: "[data-tutorial='audit-header']",
    title: "Audit Logs",
    description: "Welcome to Audit Logs! This admin-only page tracks all system activities with detailed change information. Perfect for compliance and monitoring.",
  },
  {
    target: "[data-tutorial='refresh-logs-btn']",
    title: "Refresh Logs",
    description: "Click to refresh the audit logs and get the latest activity data from the server.",
  },
  {
    target: "[data-tutorial='download-logs-btn']",
    title: "Download Audit Report",
    description: "Export all audit logs as an Excel file for offline analysis, reporting, or compliance documentation.",
  },
  {
    target: "[data-tutorial='logs-search']",
    title: "Search Audit Logs",
    description: "Search across user names, actions, and target types to quickly find specific activities or incidents.",
  },
  {
    target: "[data-tutorial='date-filters']",
    title: "Date Range Filters",
    description: "Filter audit logs by date range to focus on activities within a specific time period. Useful for incident investigation.",
  },
  {
    target: "[data-tutorial='logs-table']",
    title: "Audit Logs Table",
    description: "View all system activities with user, action type, target details, and timestamps. Click rows with arrows to expand and see detailed change information.",
  },
  {
    target: "[data-tutorial='expandable-row']",
    title: "Expandable Details",
    description: "Rows with down arrows contain metadata. Click to expand and see detailed change information like old vs new values.",
  },
  {
    target: "[data-tutorial='page-size-selector']",
    title: "Rows Per Page",
    description: "Choose how many audit log entries to display per page (10, 25, or 50) based on your analysis needs.",
  },
  {
    target: "[data-tutorial='pagination']",
    title: "Pagination Controls",
    description: "Navigate through pages of audit logs and see how many entries are currently displayed out of the total filtered results.",
  },
]

// Issuance Page Tutorial Steps
export const issuanceTutorialSteps = [
  {
    target: "[data-tutorial='issuance-header']",
    title: "Item Issuance",
    description: "Welcome to Item Issuance! This page lets you issue supplies to people or assign assets with accountability tracking.",
  },
  {
    target: "[data-tutorial='refresh-issuance-btn']",
    title: "Refresh Issuances",
    description: "Click to refresh the issuance list and get the latest transaction data from the server.",
  },
  {
    target: "[data-tutorial='new-issuance-btn']",
    title: "New Issuance",
    description: "Click to open the issuance drawer where you can issue supplies or assign assets to personnel.",
  },
  {
    target: "[data-tutorial='issuance-mode-tabs']",
    title: "Issuance Mode",
    description: "Switch between Supply mode (consumables for temporary use) and Asset mode (equipment with accountability assignment).",
  },
  {
    target: "[data-tutorial='supply-item-selector']",
    title: "Select Items",
    description: "Choose items to issue and specify quantities. Use the + button to add multiple item lines to a single issuance.",
  },
  {
    target: "[data-tutorial='issued-to-person']",
    title: "Issue to Person",
    description: "Select the person receiving the supplies. This creates accountability and tracks who has what items.",
  },
  {
    target: "[data-tutorial='search-issuance']",
    title: "Search Issuances",
    description: "Search through all issuance records by item names, accountable persons, or other details.",
  },
  {
    target: "[data-tutorial='issuance-filters']",
    title: "Filter Options",
    description: "Filter issuances by date range, type (Supply/Asset), accountable person, or specific items for focused analysis.",
  },
  {
    target: "[data-tutorial='issuance-table']",
    title: "Issuance Ledger",
    description: "View all issuances with details like date, item info, accountable person, transfers, and action buttons for management.",
  },
  {
    target: "[data-tutorial='issuance-pagination']",
    title: "Pagination Controls",
    description: "Navigate through pages of issuance records and adjust how many entries to display per page.",
  },
]

// Reports Page Tutorial Steps
export const reportsTutorialSteps = [
  {
    target: "[data-tutorial='reports-header']",
    title: "System Reports",
    description: "Welcome to Reports! Generate comprehensive reports from your inventory, stock movements, and issuance data for analysis and record-keeping.",
  },
  {
    target: "[data-tutorial='report-type-selector']",
    title: "Report Type Selection",
    description: "Choose the type of report: Inventory Summary (current stock), Stock In (receiving), Stock Out (general), or Issuance (items issued to personnel).",
  },
  {
    target: "[data-tutorial='date-range-controls']",
    title: "Date Range Options",
    description: "Filter reports by time period. Choose 'All time' for complete history or 'Custom range' to specify exact dates for your analysis.",
  },
  {
    target: "[data-tutorial='issuance-item-filter']",
    title: "Item Type Filter",
    description: "For Issuance reports, filter by item type: All items, Assets only (equipment with accountability), or Supplies only (consumables).",
  },
  {
    target: "[data-tutorial='report-filters']",
    title: "Additional Filters",
    description: "Narrow your report scope by category or accountable person. These filters help focus on specific departments, people, or item categories.",
  },
  {
    target: "[data-tutorial='generate-report-btn']",
    title: "Generate Report",
    description: "Click to generate your report based on selected criteria. The system will fetch and process all matching data for display.",
  },
  {
    target: "[data-tutorial='export-dropdown']",
    title: "Export Options",
    description: "After generating a report, export your data as Excel or CSV files for external analysis, sharing, or record-keeping.",
  },
  {
    target: "[data-tutorial='report-summary']",
    title: "Report Summary",
    description: "View the total count of records in your generated report. This gives you a quick overview of the data scope.",
  },
  {
    target: "[data-tutorial='results-table']",
    title: "Report Results",
    description: "View your report data in a structured table. Column layout changes based on report type to show the most relevant information.",
  },
]

// Stock Out Page Tutorial Steps
export const stockOutTutorialSteps = [
  {
    target: "[data-tutorial='stockout-header']",
    title: "Stock Out Page",
    description: "Welcome to the Stock Out page! This is where you can view the history of supply releases and reductions in your inventory.",
  },
  {
    target: "[data-tutorial='refresh-btn']",
    title: "Refresh List",
    description: "Click to refresh the stock out transaction list and get the latest data from the server.",
  },
  {
    target: "[data-tutorial='record-stockout-btn']",
    title: "Record Stock Out",
    description: "Click this button to record a new stock out transaction. You'll be taken to the Issuance page to complete the transaction.",
  },
  {
    target: "[data-tutorial='view-inventory-btn']",
    title: "View Inventory",
    description: "Quick link to view all items in your inventory to check current stock levels.",
  },
  {
    target: "[data-tutorial='stats-cards']",
    title: "Stock Out Statistics",
    description: "View key metrics: stock out transactions recorded today, this month, and total historical count.",
  },
  {
    target: "[data-tutorial='stockout-form']",
    title: "Quick Stock Out Form",
    description: "For reference only - use the Issuance page for recording actual transactions. This shows the information captured when recording stock out.",
  },
  {
    target: "[data-tutorial='transactions-section']",
    title: "Transaction History",
    description: "View all past stock out transactions with details including date, items, issued to, purpose, and responsible person.",
  },
  {
    target: "[data-tutorial='search-filter']",
    title: "Search & Filter",
    description: "Search transactions by item name, issued to, or responsible person. Use date filters to narrow results by time period.",
  },
]

// Stock In Page Tutorial Steps
export const stockInTutorialSteps = [
  {
    target: "[data-tutorial='stockin-header']",
    title: "Stock In Page",
    description: "Welcome to the Stock In page! Record incoming inventory and track all stock in transactions for your supplies.",
  },
  {
    target: "[data-tutorial='refresh-btn']",
    title: "Refresh List",
    description: "Click to refresh the stock in transaction list and get the latest data from the server.",
  },
  {
    target: "[data-tutorial='stockout-link']",
    title: "Go to Stock Out",
    description: "Quick link to navigate to the Stock Out page to view supply releases and reductions.",
  },
  {
    target: "[data-tutorial='view-inventory-btn']",
    title: "View Inventory",
    description: "Quick link to view all items in your inventory to check current stock levels.",
  },
  {
    target: "[data-tutorial='stats-cards']",
    title: "Stock In Statistics",
    description: "View key metrics: stock in transactions recorded today, this month, and total historical count.",
  },
  {
    target: "[data-tutorial='mode-toggle']",
    title: "Entry Mode Toggle",
    description: "Switch between Supplies mode (for consumable items) and Asset mode (for adding new property/equipment). Most restocking uses Supplies mode.",
  },
  {
    target: "[data-tutorial='stockin-form']",
    title: "Stock In Form",
    description: "Add items to stock in: select item, enter quantity, and add optional remarks. You can add multiple items in one transaction.",
  },
  {
    target: "[data-tutorial='add-line-btn']",
    title: "Add Multiple Items",
    description: "Click the plus button to add another line and record multiple items in a single stock in transaction.",
  },
  {
    target: "[data-tutorial='submit-btn']",
    title: "Submit Stock In",
    description: "Click to record the stock in transaction. The quantities will be added to your inventory immediately.",
  },
  {
    target: "[data-tutorial='transactions-section']",
    title: "Transaction History",
    description: "View all past stock in transactions with details including date, items, quantities, and remarks.",
  },
  {
    target: "[data-tutorial='search-filter']",
    title: "Search & Filter",
    description: "Search transactions by item name or remarks. Use date filters to narrow results by time period.",
  },
]

// Export all tutorial configurations
export const tutorialConfigs = {
  dashboard: dashboardTutorialSteps,
  items: itemsPageTutorialSteps,
  manageCategories: manageCategoriesTutorialSteps,
  categoryItems: categoryItemsTutorialSteps,
  inventoryMovements: inventoryMovementsTutorialSteps,
  userManagement: userManagementTutorialSteps,
  auditLogs: auditLogsTutorialSteps,
  issuance: issuanceTutorialSteps,
  reports: reportsTutorialSteps,
  stockOut: stockOutTutorialSteps,
  stockIn: stockInTutorialSteps,
}

export default tutorialConfigs
