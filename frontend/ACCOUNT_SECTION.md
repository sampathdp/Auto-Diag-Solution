# Account Section Architecture

The `account` section provides authenticated users with tools to manage their profiles, orders, saved vehicles, addresses, and wishlist.

## Directory Structure

```text
src/app/[locale]/(storefront)/account/
├── layout.tsx                # Account shell (Desktop sidebar, Mobile bottom-tab bar)
├── overview/page.tsx         # Dashboard summary
├── profile/page.tsx          # Profile details + Change password (Zod validation, Dirty-state guards)
├── vehicles/page.tsx         # Saved vehicles list + Add/Edit vehicle drawers
├── addresses/page.tsx        # Saved addresses
├── orders/page.tsx           # Order history list
├── orders/[id]/page.tsx      # Order detail
├── wishlist/page.tsx         # Saved products
└── notifications/page.tsx    # Notification preferences
```

## Key Components

- **`AccountPageHeader`**: Standardized header with title, subtitle, and optional action buttons.
- **`SideDrawer`**: Used for forms on desktop and acts as a bottom sheet on mobile (e.g., adding a vehicle).
- **`ConfirmDialog`**: A reusable destructive action confirmation modal (used for deleting vehicles, addresses, clearing wishlist).
- **`CommandPalette`**: Global `Cmd+K` navigation menu.
- **`ShortcutsModal`**: Global `?` keyboard shortcuts menu.
- **`EmptyState`**: Standardized empty state component for lists without data.

## State Management

Zustand stores handle global state synchronization with the mock API:

- **`useVehicleStore.ts`**: Manages the globally active vehicle used for filtering parts.
- **`useWishlistStore.ts`**: Syncs wishlist IDs with the server.
- **`useAuthStore.ts`**: Handles mock authentication state.

`GlobalStateInitializer` in the storefront layout ensures these stores sync with the API on the first client load.

## Mock API Integration

All data is served by MSW (Mock Service Worker).

- **Database (`mocks/storefront/db.ts`)**: Defines mock entities (orders, vehicles, addresses, wishlist, profile).
- **Handlers (`mocks/storefront/handlers.ts`)**: Implements standard REST endpoints (`GET`, `POST`, `PATCH`, `DELETE`).

## Forms and Validation

- **React Hook Form**: Handles form state and submission.
- **Zod**: Schema-based validation for strong typing and inline error messages (e.g., UAE phone numbers, password strength).
- **`useUnsavedChangesGuard`**: A custom hook that intercepts navigation and warns the user if they try to leave with unsaved form changes.

## RTL & Localization

- Built with standard Tailwind CSS logical utilities (`mr`, `ml` are replaced with `me`, `ms` where appropriate, or rely on flex-gap and grid gaps which flip automatically).
- Icons use `rtl:rotate-180` where directional (e.g., `ArrowLeft`).
- Built entirely within the `next-intl` localization structure.
