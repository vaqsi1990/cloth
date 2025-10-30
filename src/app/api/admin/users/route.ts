import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        banned: true,
        banReason: true,
        bannedAt: true,
        personalId: true,
        phone: true,
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
        verification: {
          select: {
            status: true,
            idFrontUrl: true,
            idBackUrl: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { userId, status, comment } = body;
    if (!userId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data' },
        { status: 400 }
      );
    }
    const verification = await prisma.userVerification.findUnique({ where: { userId } });
    if (!verification) {
      return NextResponse.json({ success: false, error: 'Verification not found' }, { status: 404 });
    }
    const updated = await prisma.userVerification.update({
      where: { userId },
      data: {
        status,
        comment: status === 'REJECTED' ? comment || null : null,
      },
    });
    return NextResponse.json({ success: true, verification: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Verification update failed' },
      { status: 500 }
    );
  }
}
