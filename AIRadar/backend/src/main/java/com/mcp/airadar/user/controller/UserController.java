package com.mcp.airadar.user.controller;

import com.mcp.airadar.user.dto.AddInterestRequest;
import com.mcp.airadar.user.dto.BookmarkHistoryDto;
import com.mcp.airadar.user.dto.LikeHistoryDto;
import com.mcp.airadar.user.dto.OnboardingRequest;
import com.mcp.airadar.user.dto.UpdateProfileRequest;
import com.mcp.airadar.user.dto.UserInterestDto;
import com.mcp.airadar.user.dto.UserProfileDto;
import com.mcp.airadar.user.dto.ViewHistoryDto;
import com.mcp.airadar.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserProfileDto> getProfile(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @GetMapping("/interests")
    public ResponseEntity<List<UserInterestDto>> getInterests(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getInterests(userId));
    }

    @PostMapping("/interests")
    public ResponseEntity<UserInterestDto> addInterest(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody AddInterestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.addInterest(userId, request));
    }

    @DeleteMapping("/interests/{keyword}")
    public ResponseEntity<Void> deleteInterest(
            @AuthenticationPrincipal UUID userId,
            @PathVariable String keyword) {
        userService.deleteInterest(userId, keyword);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping
    public ResponseEntity<UserProfileDto> updateProfile(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ViewHistoryDto>> getViewHistory(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getViewHistory(userId));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<List<BookmarkHistoryDto>> getBookmarkHistory(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getBookmarkHistory(userId));
    }

    @GetMapping("/likes")
    public ResponseEntity<List<LikeHistoryDto>> getLikeHistory(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getLikeHistory(userId));
    }

    @PostMapping("/onboarding")
    public ResponseEntity<Void> completeOnboarding(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody OnboardingRequest request) {
        userService.completeOnboarding(userId, request);
        return ResponseEntity.ok().build();
    }
}
