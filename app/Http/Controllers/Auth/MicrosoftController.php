<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class MicrosoftController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('microsoft')
            ->scopes(['openid', 'profile', 'email', 'User.Read'])
            ->redirect();
    }

    public function callback()
    {
        try {
            $msUser = Socialite::driver('microsoft')->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->with('error', 'sso_failed');
        }

        // Get extra profile data from Graph API
        $token = $msUser->token;

        $graphResponse = \Illuminate\Support\Facades\Http::withToken($token)
            ->get('https://graph.microsoft.com/v1.0/me', [
                '$select' => 'id,displayName,mail,employeeId,department,officeLocation,jobTitle,companyName'
            ]);

        $profile = $graphResponse->json();

        $user = User::updateOrCreate(
            ['email' => $msUser->getEmail()],
            [
                'full_name'              => $msUser->getName(),
                'microsoft_id'      => $msUser->getId(),
                'employee_id'       => $profile['employeeId'] ?? null,
                'department'        => $profile['department'] ?? null,
                'branch'            => $profile['officeLocation'] ?? null,
                'job_title'         => $profile['jobTitle'] ?? null,
                'company_name'      => $profile['companyName'] ?? null,
                'email_verified_at' => now(),
                'password'          => null,
            ]
        );

        Auth::login($user, true);

        return redirect()->intended(route('forecast'));
    }
}
