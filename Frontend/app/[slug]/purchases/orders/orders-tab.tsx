import { OrderTableManager } from './order-table-manager'

interface Props {
    orders: any[];
    customers: any[];
    orgId: string;
    slug: string;
    currentUser: any;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function OrdersTab({ orders, customers, orgId, slug, currentUser, canEdit, canDelete }: Props) {
    return (
        <OrderTableManager
            initialOrders={orders}
            customers={customers}
            orgId={orgId}
            slug={slug}
            currentUser={currentUser}
            canEdit={canEdit}
            canDelete={canDelete}
        />
    )
}
