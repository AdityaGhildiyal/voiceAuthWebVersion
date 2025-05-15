export interface VoiceSample {
  id: number
  s3Key: string  
}

export interface User {
  email: string
  voiceSamples: VoiceSample[]
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const mockUsers: User[] = [
    {
      email: "test@example.com",
      voiceSamples: [
        { id: 1, s3Key: `users/test@example.com/sample1.webm` },
        { id: 2, s3Key: `users/test@example.com/sample2.webm` },
      ],
    },
  ]

  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
  return user
}
