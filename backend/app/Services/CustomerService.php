<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\AdminNoteRepository;
use App\Repositories\CustomerRepository;
use App\Repositories\OrderRepository;

class CustomerService
{
    private const VALID_STATUS = ['active', 'blocked'];

    private CustomerRepository $repo;
    private OrderRepository $orders;
    private AdminNoteRepository $notes;

    public function __construct()
    {
        $this->repo = new CustomerRepository();
        $this->orders = new OrderRepository();
        $this->notes = new AdminNoteRepository();
    }

    public function list(array $filters, string $search, int $page, int $perPage): array
    {
        $rows = $this->repo->paginate($filters, $search, $page, $perPage);
        return [
            'items' => array_map([$this, 'shapeListRow'], $rows),
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $customer = $this->repo->findCustomer($id);
        if (!$customer) {
            throw new DomainException('Customer not found', 404);
        }

        $address = $this->repo->defaultAddress($id);

        return [
            'id' => (int)$customer['id'],
            'name' => $customer['name'],
            'email' => $customer['email'],
            'phone' => $customer['phone'] ?? '',
            'emirate' => $address['emirate'] ?? '',
            'city' => $address['city'] ?? '',
            'status' => (int)$customer['is_active'] === 1 ? 'active' : 'blocked',
            'orders_count' => $this->orders->countByUser($id),
            'total_spent' => $this->orders->sumTotalByUser($id),
            'internal_notes' => $this->notes->forEntity('customer', $id),
            'created_at' => $customer['created_at'],
        ];
    }

    public function addresses(int $id): array
    {
        if (!$this->repo->findCustomer($id)) {
            throw new DomainException('Customer not found', 404);
        }
        return array_map(function (array $row): array {
            $row['id'] = (int)$row['id'];
            $row['customer_id'] = (int)$row['customer_id'];
            $row['is_default'] = (bool)$row['is_default'];
            return $row;
        }, $this->repo->addresses($id));
    }

    public function updateStatus(int $id, string $status): array
    {
        if (!in_array($status, self::VALID_STATUS, true)) {
            throw new DomainException('Invalid status', 422);
        }
        if (!$this->repo->findCustomer($id)) {
            throw new DomainException('Customer not found', 404);
        }
        $this->repo->setActive($id, $status === 'active');
        return $this->find($id);
    }

    public function addNote(int $id, string $text, int $adminId): array
    {
        if (!$this->repo->findCustomer($id)) {
            throw new DomainException('Customer not found', 404);
        }
        $text = trim($text);
        if ($text === '') {
            throw new DomainException('Note cannot be empty', 422);
        }
        $this->notes->create('customer', $id, $adminId, $text);
        return $this->find($id);
    }

    private function shapeListRow(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'] ?? '',
            'status' => (int)$row['is_active'] === 1 ? 'active' : 'blocked',
            'orders_count' => (int)$row['orders_count'],
            'total_spent' => (float)$row['total_spent'],
            'created_at' => $row['created_at'],
        ];
    }
}
