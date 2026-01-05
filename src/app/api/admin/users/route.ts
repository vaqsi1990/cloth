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
      // Fetch all users (USER, ADMIN, SUPPORT) so admin can manage all roles
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
        iban: true,
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
        verification: {
          select: {
            status: true, // Legacy field
            identityStatus: true, // May not exist in old databases
            entrepreneurStatus: true, // May not exist in old databases
            idFrontUrl: true,
            idBackUrl: true,
            entrepreneurCertificateUrl: true,
            comment: true, // Legacy field
            identityComment: true, // May not exist in old databases
            entrepreneurComment: true, // May not exist in old databases
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
      } else if (verificationType === 'entrepreneur') {
        // ინდმეწარმის საბუთის დამტკიცება → blocked = false
        userUpdateData.blocked = false;
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
