import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

// GET - Fetch all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin/support role
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    const skip = (page - 1) * limit
    const search = searchParams.get('search')?.trim()

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          banned: true,
          banReason: true,
          bannedAt: true,
          blocked: true,
          verified: true,
          personalId: true,
          phone: true,
          location: true,
          address: true,
          iban: true,
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
          verification: {
            select: {
              status: true,
              identityStatus: true,
              entrepreneurStatus: true,
              idFrontUrl: true,
              idBackUrl: true,
              entrepreneurCertificateUrl: true,
              comment: true,
              identityComment: true,
              entrepreneurComment: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      users,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })

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
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { userId, status, comment, verificationType } = body;
    if (!userId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data' },
        { status: 400 }
      );
    }
    
    // verificationType: 'identity' for idFrontUrl/idBackUrl, 'entrepreneur' for entrepreneurCertificateUrl
    if (!verificationType || !['identity', 'entrepreneur'].includes(verificationType)) {
      return NextResponse.json(
        { success: false, error: 'verificationType must be "identity" or "entrepreneur"' },
        { status: 400 }
      );
    }

    const verification = await prisma.userVerification.findUnique({ 
      where: { userId },
      select: {
        userId: true,
        identityStatus: true,
        entrepreneurStatus: true,
        status: true,
      }
    });
    if (!verification) {
      return NextResponse.json({ success: false, error: 'Verification not found' }, { status: 404 });
    }
    
    // Update verification status based on type
    const updateData: {
      identityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
      entrepreneurStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
      identityComment?: string | null;
      entrepreneurComment?: string | null;
      status?: 'PENDING' | 'APPROVED' | 'REJECTED'; // Legacy field
      comment?: string | null; // Legacy field
    } = {};

    if (verificationType === 'identity') {
      updateData.identityStatus = status;
      updateData.identityComment = status === 'REJECTED' ? comment || null : null;
    } else if (verificationType === 'entrepreneur') {
      updateData.entrepreneurStatus = status;
      updateData.entrepreneurComment = status === 'REJECTED' ? comment || null : null;
    }

    // Update legacy fields for backward compatibility
    updateData.status = status;
    updateData.comment = status === 'REJECTED' ? comment || null : null;

    const updated = await prisma.userVerification.update({
      where: { userId },
      data: updateData,
      select: {
        id: true,
        userId: true,
        idFrontUrl: true,
        idBackUrl: true,
        entrepreneurCertificateUrl: true,
        identityStatus: true,
        entrepreneurStatus: true,
        identityComment: true,
        entrepreneurComment: true,
        status: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Update user fields based on verification type
    if (status === 'APPROVED') {
      const userUpdateData: { verified?: boolean; blocked?: boolean } = {};
      
      if (verificationType === 'identity') {
        // პირადობის დოკუმენტების დამტკიცება → verified = true
        userUpdateData.verified = true;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }
    }

    return NextResponse.json({ success: true, verification: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Verification update failed' },
      { status: 500 }
    );
  }
}
